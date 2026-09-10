"""
SentinelGraph — Graph Builder
==============================
Converts cleaned tabular flow data into temporal graph snapshots.

This is the critical bridge between raw CIC-IDS-2018 flows and the
TGN model input format.

Output format:
- A list of GraphSnapshot objects (one per time window)
- Each snapshot contains edge_index, edge_features, edge_labels
- Can be consumed by TGN as a flattened event stream (Phase 3)
  or by baselines as flattened feature vectors (Phase 2)
"""

import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    WINDOW_SIZE_SEC,
    COL_TIMESTAMP, COL_SRC_IP, COL_DST_IP,
    EDGE_FEATURE_COLS,
)
from src.utils import get_logger, timer

logger = get_logger("graph_builder")


# ═══════════════════════════════════════════════════════════════
#  DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════

@dataclass
class GraphSnapshot:
    """
    A single graph snapshot representing network activity within a time window.

    Attributes
    ----------
    window_id : int
        Sequential window index.
    timestamp : datetime
        Start time of this window.
    timestamp_end : datetime
        End time of this window.
    edge_index : np.ndarray
        Shape (2, num_edges) — source and destination node IDs.
    edge_features : np.ndarray
        Shape (num_edges, num_features) — normalized flow features.
    edge_labels : np.ndarray
        Shape (num_edges,) — integer attack category labels.
    edge_timestamps : np.ndarray
        Shape (num_edges,) — per-edge timestamps (seconds since epoch).
        Needed for TGN's temporal ordering.
    node_ids : list[int]
        List of unique node IDs active in this window.
    num_nodes : int
        Count of active nodes.
    num_edges : int
        Count of edges.
    attack_counts : dict
        Distribution of attack types in this window.
    raw_src_ips : list[str]
        Original source IPs (for explainability / display).
    raw_dst_ips : list[str]
        Original destination IPs (for explainability / display).
    """
    window_id: int
    timestamp: datetime
    timestamp_end: datetime
    edge_index: np.ndarray
    edge_features: np.ndarray
    edge_labels: np.ndarray
    edge_timestamps: np.ndarray
    node_ids: list = field(default_factory=list)
    num_nodes: int = 0
    num_edges: int = 0
    attack_counts: dict = field(default_factory=dict)
    raw_src_ips: list = field(default_factory=list)
    raw_dst_ips: list = field(default_factory=list)

    def has_attacks(self) -> bool:
        """Whether this window contains any attack flows."""
        return (self.edge_labels > 0).any() if len(self.edge_labels) > 0 else False

    def attack_ratio(self) -> float:
        """Fraction of edges that are attacks."""
        if len(self.edge_labels) == 0:
            return 0.0
        return (self.edge_labels > 0).sum() / len(self.edge_labels)

    def summary(self) -> str:
        """One-line summary for logging/display."""
        attack_pct = self.attack_ratio() * 100
        return (
            f"Window {self.window_id:>4d} | "
            f"{self.timestamp.strftime('%H:%M:%S')} | "
            f"nodes={self.num_nodes:>4d} | "
            f"edges={self.num_edges:>5d} | "
            f"attacks={attack_pct:>5.1f}%"
        )


# ═══════════════════════════════════════════════════════════════
#  IP → NODE ID MAPPING
# ═══════════════════════════════════════════════════════════════

class IPNodeMapper:
    """
    Maintains a consistent mapping from IP addresses to integer node IDs
    across all time windows.

    This is important: the same IP must always map to the same node ID
    so that TGN's per-node memory is coherent across windows.
    """

    def __init__(self):
        self._ip_to_id: dict[str, int] = {}
        self._id_to_ip: dict[int, str] = {}
        self._next_id: int = 0

    def get_or_create(self, ip: str) -> int:
        """Get the node ID for an IP, creating a new one if needed."""
        if ip not in self._ip_to_id:
            self._ip_to_id[ip] = self._next_id
            self._id_to_ip[self._next_id] = ip
            self._next_id += 1
        return self._ip_to_id[ip]

    def get_ip(self, node_id: int) -> str:
        """Reverse lookup: node ID → IP address."""
        return self._id_to_ip.get(node_id, "unknown")

    @property
    def num_nodes(self) -> int:
        """Total number of unique IPs seen so far."""
        return self._next_id

    def get_ids_batch(self, ips: list[str] | pd.Series) -> np.ndarray:
        """Vectorized lookup/creation for a batch of IPs."""
        return np.array([self.get_or_create(ip) for ip in ips])


# ═══════════════════════════════════════════════════════════════
#  FEATURE NORMALIZATION
# ═══════════════════════════════════════════════════════════════

class FeatureNormalizer:
    """
    Min-max normalization fitted on the full dataset, then applied
    per-window. Avoids data leakage from future windows.
    """

    def __init__(self):
        self.mins: Optional[np.ndarray] = None
        self.maxs: Optional[np.ndarray] = None
        self.ranges: Optional[np.ndarray] = None
        self._fitted = False

    def fit(self, df: pd.DataFrame, feature_cols: list[str]):
        """Fit normalizer on the full dataset."""
        values = df[feature_cols].values.astype(np.float64)
        self.mins = np.nanmin(values, axis=0)
        self.maxs = np.nanmax(values, axis=0)
        self.ranges = self.maxs - self.mins
        # Avoid division by zero for constant columns
        self.ranges[self.ranges == 0] = 1.0
        self._fitted = True
        logger.info(f"Normalizer fitted on {len(feature_cols)} features")

    def transform(self, values: np.ndarray) -> np.ndarray:
        """Normalize a batch of feature values to [0, 1]."""
        if not self._fitted:
            raise RuntimeError("Normalizer not fitted — call fit() first")
        normalized = (values - self.mins) / self.ranges
        return np.clip(normalized, 0.0, 1.0)


# ═══════════════════════════════════════════════════════════════
#  GRAPH SNAPSHOT BUILDER
# ═══════════════════════════════════════════════════════════════

def build_graph_snapshots(
    df: pd.DataFrame,
    window_size_sec: int = WINDOW_SIZE_SEC,
    feature_cols: list[str] = EDGE_FEATURE_COLS,
    min_edges: int = 2,
) -> tuple[list[GraphSnapshot], IPNodeMapper, FeatureNormalizer]:
    """
    Convert a cleaned DataFrame into a sequence of temporal graph snapshots.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned DataFrame from data_loader (must have timestamp, IP, label columns).
    window_size_sec : int
        Duration of each time window in seconds.
    feature_cols : list[str]
        Column names to use as edge features.
    min_edges : int
        Skip windows with fewer edges than this (too sparse to be useful).

    Returns
    -------
    snapshots : list[GraphSnapshot]
        Ordered list of graph snapshots.
    ip_mapper : IPNodeMapper
        The IP→NodeID mapper (needed for Phase 3 TGN).
    normalizer : FeatureNormalizer
        The fitted feature normalizer.
    """
    with timer("Graph snapshot construction", logger):
        # ── Fit normalizer on full dataset ───────────────────
        normalizer = FeatureNormalizer()
        normalizer.fit(df, feature_cols)

        # ── Create IP mapper ─────────────────────────────────
        ip_mapper = IPNodeMapper()

        # ── Segment into time windows ────────────────────────
        ts_col = df[COL_TIMESTAMP]
        t_min = ts_col.min()
        t_max = ts_col.max()
        total_seconds = (t_max - t_min).total_seconds()
        num_windows = max(1, int(np.ceil(total_seconds / window_size_sec)))
        logger.info(
            f"Time range: {t_min} -> {t_max} ({total_seconds:.0f}s)"
        )
        logger.info(
            f"Building {num_windows} windows x {window_size_sec}s each"
        )

        snapshots = []
        skipped = 0

        for w_idx in range(num_windows):
            w_start = t_min + pd.Timedelta(seconds=w_idx * window_size_sec)
            w_end = w_start + pd.Timedelta(seconds=window_size_sec)

            # Filter flows in this window
            mask = (ts_col >= w_start) & (ts_col < w_end)
            window_df = df.loc[mask]

            if len(window_df) < min_edges:
                skipped += 1
                continue

            # ── Build edge_index ─────────────────────────────
            src_ids = ip_mapper.get_ids_batch(window_df[COL_SRC_IP].values)
            dst_ids = ip_mapper.get_ids_batch(window_df[COL_DST_IP].values)
            edge_index = np.stack([src_ids, dst_ids], axis=0)  # (2, num_edges)

            # ── Build edge features ──────────────────────────
            raw_features = window_df[feature_cols].values.astype(np.float64)
            # Replace any remaining NaN/Inf
            raw_features = np.nan_to_num(raw_features, nan=0.0, posinf=0.0, neginf=0.0)
            edge_features = normalizer.transform(raw_features)

            # ── Build edge labels ────────────────────────────
            edge_labels = window_df["label_id"].values.astype(np.int64)

            # ── Edge timestamps (seconds since epoch for TGN) ──
            edge_timestamps = (
                window_df[COL_TIMESTAMP]
                .astype(np.int64) // 10**9  # nanoseconds → seconds
            ).values.astype(np.float64)

            # ── Attack distribution ──────────────────────────
            attack_counts = (
                window_df["label_category"]
                .value_counts()
                .to_dict()
            )

            # ── Active nodes ─────────────────────────────────
            active_nodes = sorted(set(src_ids) | set(dst_ids))

            snapshot = GraphSnapshot(
                window_id=w_idx,
                timestamp=w_start.to_pydatetime(),
                timestamp_end=w_end.to_pydatetime(),
                edge_index=edge_index,
                edge_features=edge_features,
                edge_labels=edge_labels,
                edge_timestamps=edge_timestamps,
                node_ids=active_nodes,
                num_nodes=len(active_nodes),
                num_edges=len(edge_labels),
                attack_counts=attack_counts,
                raw_src_ips=window_df[COL_SRC_IP].tolist(),
                raw_dst_ips=window_df[COL_DST_IP].tolist(),
            )
            snapshots.append(snapshot)

        logger.info(
            f"Built {len(snapshots)} snapshots "
            f"(skipped {skipped} sparse windows)"
        )
        logger.info(f"Total unique IPs -> node IDs: {ip_mapper.num_nodes}")

    return snapshots, ip_mapper, normalizer


# ═══════════════════════════════════════════════════════════════
#  FLATTENED EVENT STREAM (for TGN Phase 3)
# ═══════════════════════════════════════════════════════════════

def snapshots_to_event_stream(
    snapshots: list[GraphSnapshot],
) -> dict[str, np.ndarray]:
    """
    Flatten a list of graph snapshots into a single event stream
    suitable for TGN's input format.

    TGN processes events as: (src, dst, timestamp, edge_features, label)
    one at a time, in temporal order.

    Returns
    -------
    dict with keys:
        'src' : np.ndarray (N,) — source node IDs
        'dst' : np.ndarray (N,) — destination node IDs
        'timestamps' : np.ndarray (N,) — edge timestamps
        'edge_features' : np.ndarray (N, F) — feature vectors
        'labels' : np.ndarray (N,) — edge labels
    """
    all_src = []
    all_dst = []
    all_ts = []
    all_feats = []
    all_labels = []

    for snap in snapshots:
        if snap.num_edges == 0:
            continue
        all_src.append(snap.edge_index[0])
        all_dst.append(snap.edge_index[1])
        all_ts.append(snap.edge_timestamps)
        all_feats.append(snap.edge_features)
        all_labels.append(snap.edge_labels)

    if not all_src:
        return {
            "src": np.array([], dtype=np.int64),
            "dst": np.array([], dtype=np.int64),
            "timestamps": np.array([], dtype=np.float64),
            "edge_features": np.empty((0, 0), dtype=np.float64),
            "labels": np.array([], dtype=np.int64),
        }

    event_stream = {
        "src": np.concatenate(all_src),
        "dst": np.concatenate(all_dst),
        "timestamps": np.concatenate(all_ts),
        "edge_features": np.vstack(all_feats),
        "labels": np.concatenate(all_labels),
    }

    # Sort by timestamp (TGN requires temporal ordering)
    sort_idx = np.argsort(event_stream["timestamps"])
    for key in event_stream:
        event_stream[key] = event_stream[key][sort_idx]

    logger.info(
        f"Event stream: {len(event_stream['src']):,} events, "
        f"{event_stream['edge_features'].shape[1]} features"
    )
    return event_stream


# ═══════════════════════════════════════════════════════════════
#  FLATTENED FEATURES (for baseline models in Phase 2)
# ═══════════════════════════════════════════════════════════════

def snapshots_to_flat_features(
    snapshots: list[GraphSnapshot],
) -> tuple[np.ndarray, np.ndarray]:
    """
    Extract flat feature matrix and label vector from snapshots
    for training scikit-learn baseline models.

    Returns
    -------
    X : np.ndarray (N, F) — feature matrix
    y : np.ndarray (N,) — labels
    """
    all_feats = []
    all_labels = []

    for snap in snapshots:
        if snap.num_edges == 0:
            continue
        all_feats.append(snap.edge_features)
        all_labels.append(snap.edge_labels)

    X = np.vstack(all_feats)
    y = np.concatenate(all_labels)

    logger.info(f"Flat features: X={X.shape}, y={y.shape}")
    return X, y


# ═══════════════════════════════════════════════════════════════
#  NETWORKX GRAPH (for visualization)
# ═══════════════════════════════════════════════════════════════

def snapshot_to_networkx(snapshot: GraphSnapshot, ip_mapper: IPNodeMapper):
    """
    Convert a GraphSnapshot to a NetworkX DiGraph for visualization.

    Returns
    -------
    networkx.DiGraph
        Graph with IP labels on nodes and attack info on edges.
    """
    import networkx as nx

    G = nx.DiGraph()

    # Add nodes with IP labels
    for nid in snapshot.node_ids:
        G.add_node(nid, ip=ip_mapper.get_ip(nid))

    # Add edges with attack labels
    for i in range(snapshot.num_edges):
        src = snapshot.edge_index[0, i]
        dst = snapshot.edge_index[1, i]
        label = snapshot.edge_labels[i]
        G.add_edge(
            src, dst,
            label=int(label),
            is_attack=label > 0,
        )

    return G


if __name__ == "__main__":
    # Quick smoke test
    from src.data_loader import load_dataset

    print("=" * 60)
    print("  SentinelGraph Graph Builder — Smoke Test")
    print("=" * 60)

    df = load_dataset(max_rows=5_000)
    snapshots, mapper, normalizer = build_graph_snapshots(df, window_size_sec=60)

    print(f"\nBuilt {len(snapshots)} graph snapshots")
    print(f"Total unique nodes: {mapper.num_nodes}")

    print("\nFirst 5 snapshots:")
    for snap in snapshots[:5]:
        print(f"  {snap.summary()}")

    if snapshots:
        snap = snapshots[0]
        print(f"\nSnapshot 0 details:")
        print(f"  edge_index shape:    {snap.edge_index.shape}")
        print(f"  edge_features shape: {snap.edge_features.shape}")
        print(f"  edge_labels shape:   {snap.edge_labels.shape}")
        print(f"  Feature range: [{snap.edge_features.min():.3f}, {snap.edge_features.max():.3f}]")
        print(f"  Attack counts: {snap.attack_counts}")
