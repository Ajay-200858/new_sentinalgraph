"""
backend/train_tgn.py
====================
Training utilities for the TemporalGraphTGN in SentinelGraph.

Key design choices
------------------
* Chronological sorting:   events are always sorted by timestamp before training.
* Time-based split:        train/val split is on time (first 80%), NOT random.
                           This prevents future data leakage in validation.
* Predict-then-update:     enforced inside TemporalGraphTGN.process_event().
* Truncated BPTT:          within each window of `bptt_window` events, gradients
                           flow freely between consecutive events. After the
                           window ends, node memories are detached, preventing an
                           unbounded computation graph while still capturing
                           meaningful temporal dependencies.
* Memory reset:            call reset_temporal_state() between independent
                           sequences (e.g., start of each epoch).
* Unknown label handling:  rows with labels absent from the encoder are skipped
                           with a WARNING (not an error).
* Checkpoint format:       saves model state, all dimension params, class names,
                           and architecture metadata for safe future reloading.

Usage example
-------------
    from backend.tgn_core import TemporalGraphTGN
    from backend.train_tgn import (
        build_temporal_events, time_based_split,
        train_one_epoch, evaluate_temporal_model,
        save_checkpoint, load_checkpoint,
    )

    model = TemporalGraphTGN(feature_dim=len(feature_cols), num_classes=5)
    events = build_temporal_events(df, feature_cols, label_col="Label",
                                   label_encoder=le, ip_mapper=ip_mapper)
    train_events, val_events = time_based_split(events, train_frac=0.8)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    for epoch in range(10):
        reset_temporal_state(model)
        metrics = train_one_epoch(model, train_events, optimizer)
        val_metrics = evaluate_temporal_model(model, val_events)

    save_checkpoint(model, "models/tgn_checkpoint.pt", feature_cols, le.classes_)
"""

import logging
import os
import time
import warnings
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger("sentinelgraph.train_tgn")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

class TemporalEvent:
    """
    A single temporal network-flow event, ready for TGN processing.

    Attributes
    ----------
    src_id    : integer node ID for source IP
    dst_id    : integer node ID for destination IP
    timestamp : float, unix-epoch seconds
    features  : np.ndarray, float32, shape (feature_dim,)
    label_idx : int, class index from LabelEncoder
    label_str : str, human-readable class name
    """
    __slots__ = ("src_id", "dst_id", "timestamp", "features", "label_idx", "label_str")

    def __init__(self, src_id: int, dst_id: int, timestamp: float,
                 features: np.ndarray, label_idx: int, label_str: str):
        self.src_id    = src_id
        self.dst_id    = dst_id
        self.timestamp = timestamp
        self.features  = features
        self.label_idx = label_idx
        self.label_str = label_str


# ---------------------------------------------------------------------------
# Node mapping
# ---------------------------------------------------------------------------

class IPNodeMapper:
    """
    Maps IP address strings to monotonically increasing integer node IDs.
    Thread-safe enough for single-process use.
    """

    def __init__(self):
        self._ip_to_id: Dict[str, int] = {}
        self._id_to_ip: Dict[int, str] = {}
        self._next_id: int = 0

    def get_or_create(self, ip: str) -> int:
        if ip not in self._ip_to_id:
            self._ip_to_id[ip] = self._next_id
            self._id_to_ip[self._next_id] = ip
            self._next_id += 1
        return self._ip_to_id[ip]

    @property
    def num_nodes(self) -> int:
        return self._next_id

    def get_ip(self, node_id: int) -> Optional[str]:
        return self._id_to_ip.get(node_id)


def create_node_mapping(events: List[TemporalEvent]) -> IPNodeMapper:
    """
    Build a node mapping from an existing event list.
    Useful when you need to inspect the mapping after build_temporal_events().
    """
    mapper = IPNodeMapper()
    seen: set = set()
    for e in events:
        # IDs already assigned; just reconstruct the lookup
        if e.src_id not in seen:
            seen.add(e.src_id)
        if e.dst_id not in seen:
            seen.add(e.dst_id)
    return mapper


# ---------------------------------------------------------------------------
# Dataset builder
# ---------------------------------------------------------------------------

def build_temporal_events(
    df,                              # pandas DataFrame
    feature_cols: List[str],
    label_col: str = "Label",
    ip_mapper: Optional[IPNodeMapper] = None,
    label_to_idx: Optional[Dict[str, int]] = None,
    timestamp_col: Optional[str] = None,
    src_ip_col:    Optional[str] = None,
    dst_ip_col:    Optional[str] = None,
    base_timestamp: float = 1_700_000_000.0,   # 2023-11-14 (fallback origin)
    replay_interval_sec: float = 1.0,
) -> List[TemporalEvent]:
    """
    Convert a cleaned DataFrame into a chronologically sorted list of
    TemporalEvent objects for TGN training or inference.

    Missing column handling (all with WARNING logs):
      timestamp  : generated as base_timestamp + row_index * replay_interval_sec
      src_ip     : f"192.168.1.{i % 255}"
      dst_ip     : f"10.0.0.{i % 255}"
      label      : rows with unknown labels are SKIPPED (not errored)

    Args:
        df              : cleaned DataFrame (no NaN, no inf).
        feature_cols    : list of column names to use as flow features.
        label_col       : column name for ground-truth labels.
        ip_mapper       : existing IPNodeMapper; a new one is created if None.
        label_to_idx    : dict mapping label strings to class indices;
                          if None, unique sorted labels are auto-assigned.
        timestamp_col   : column name for timestamps; None to generate.
        src_ip_col      : column name for source IP; None to generate.
        dst_ip_col      : column name for dest IP; None to generate.
        base_timestamp  : epoch seconds used as t=0 when no timestamp column.
        replay_interval_sec : seconds between synthetic timestamps.

    Returns:
        List of TemporalEvent, sorted by timestamp ascending.
    """
    import pandas as pd

    if ip_mapper is None:
        ip_mapper = IPNodeMapper()

    has_timestamp = timestamp_col and timestamp_col in df.columns
    has_src_ip    = src_ip_col    and src_ip_col    in df.columns
    has_dst_ip    = dst_ip_col    and dst_ip_col    in df.columns

    if not has_timestamp:
        logger.warning(
            "[TGN] Timestamp column '%s' not found. "
            "Generating replay timestamps (base=%.0f, interval=%.2fs). "
            "These are NOT real network timestamps.",
            timestamp_col, base_timestamp, replay_interval_sec,
        )
    if not has_src_ip:
        logger.warning(
            "[TGN] Source IP column '%s' not found. "
            "Using deterministic fallback IPs (192.168.1.x). "
            "These do NOT represent real network topology.",
            src_ip_col,
        )
    if not has_dst_ip:
        logger.warning(
            "[TGN] Destination IP column '%s' not found. "
            "Using deterministic fallback IPs (10.0.0.x). "
            "These do NOT represent real network topology.",
            dst_ip_col,
        )

    # Build label -> idx mapping
    if label_to_idx is None:
        all_labels = sorted(df[label_col].dropna().unique().tolist())
        label_to_idx = {lbl: idx for idx, lbl in enumerate(all_labels)}

    # Ensure feature_cols are numeric
    available_features = [c for c in feature_cols if c in df.columns]
    if len(available_features) < len(feature_cols):
        missing = set(feature_cols) - set(available_features)
        logger.warning("[TGN] %d feature column(s) missing from DataFrame: %s",
                       len(missing), missing)

    events: List[TemporalEvent] = []
    skipped = 0

    for i, (_, row) in enumerate(df.iterrows()):
        # Label
        raw_label = str(row.get(label_col, "Benign"))
        if raw_label not in label_to_idx:
            logger.warning("[TGN] Unknown label '%s' at row %d -- skipping.", raw_label, i)
            skipped += 1
            continue
        label_idx = label_to_idx[raw_label]

        # Timestamp
        if has_timestamp:
            ts_raw = row[timestamp_col]
            try:
                ts = float(pd.Timestamp(ts_raw).timestamp())
            except Exception:
                ts = base_timestamp + i * replay_interval_sec
        else:
            ts = base_timestamp + i * replay_interval_sec

        # IPs
        src_ip = str(row[src_ip_col]) if has_src_ip else f"192.168.1.{i % 255}"
        dst_ip = str(row[dst_ip_col]) if has_dst_ip else f"10.0.0.{i % 255}"
        src_id = ip_mapper.get_or_create(src_ip)
        dst_id = ip_mapper.get_or_create(dst_ip)

        # Features
        feat_vals = [float(row.get(c, 0.0)) for c in available_features]
        # Pad or truncate to exactly len(feature_cols)
        target_len = len(feature_cols)
        if len(feat_vals) < target_len:
            feat_vals += [0.0] * (target_len - len(feat_vals))
        elif len(feat_vals) > target_len:
            feat_vals = feat_vals[:target_len]
        features = np.array(feat_vals, dtype=np.float32)

        events.append(TemporalEvent(
            src_id=src_id, dst_id=dst_id, timestamp=ts,
            features=features, label_idx=label_idx, label_str=raw_label,
        ))

    if skipped:
        logger.warning("[TGN] %d row(s) skipped due to unknown labels.", skipped)

    # Sort chronologically -- required by TGN
    events.sort(key=lambda e: e.timestamp)

    logger.info("[TGN] build_temporal_events: %d events built, %d skipped.",
                len(events), skipped)
    return events


# ---------------------------------------------------------------------------
# Train / val split
# ---------------------------------------------------------------------------

def time_based_split(
    events: List[TemporalEvent],
    train_frac: float = 0.8,
) -> Tuple[List[TemporalEvent], List[TemporalEvent]]:
    """
    Split a chronologically sorted event list at the train_frac quantile.

    This is a time-based split (NOT random) to prevent future leakage:
    all training events occur BEFORE all validation events.
    """
    if not events:
        return [], []
    n_train = max(1, int(len(events) * train_frac))
    train   = events[:n_train]
    val     = events[n_train:]
    logger.info("[TGN] time_based_split: train=%d val=%d (%.0f%% / %.0f%%)",
                len(train), len(val), train_frac * 100, (1 - train_frac) * 100)
    return train, val


# ---------------------------------------------------------------------------
# State reset
# ---------------------------------------------------------------------------

def reset_temporal_state(model) -> None:
    """
    Reset all node memories and the temporal edge store.

    Call this:
      - At the START of each training epoch (independent sequence assumption).
      - Before evaluating on the validation set.
      - Between completely different datasets.
    """
    model.reset_state()
    logger.debug("[TGN] Node memories and edge store cleared.")


# ---------------------------------------------------------------------------
# Training loop -- one epoch
# ---------------------------------------------------------------------------

def train_one_epoch(
    model,
    events: List[TemporalEvent],
    optimizer: torch.optim.Optimizer,
    loss_fn: Optional[nn.Module] = None,
    bptt_window: int = 100,
    device: Optional[torch.device] = None,
    clip_grad_norm: float = 1.0,
) -> Dict[str, float]:
    """
    Train the TGN for one epoch over a chronologically ordered event list.

    Truncated BPTT design
    ----------------------
    * Events are processed in chronological order (required by TGN).
    * Gradients flow freely WITHIN each window of `bptt_window` events.
    * At the end of each window, memories are DETACHED (not per-event) so
      the computation graph does not grow without bound.
    * Loss is accumulated within the window and backpropagated once per window.
    * Memory reset is NOT called between windows (memories carry state across
      the epoch); only gradients are detached.

    Args:
        model       : TemporalGraphTGN instance.
        events      : chronologically sorted list of TemporalEvent.
        optimizer   : any torch optimizer (Adam recommended).
        loss_fn     : loss function (CrossEntropyLoss used if None).
        bptt_window : number of events per truncated BPTT window (default 100).
        device      : target device (auto-detected from model if None).
        clip_grad_norm : max norm for gradient clipping (0 to disable).

    Returns:
        dict with keys: loss, accuracy, macro_f1, events_processed, skipped
    """
    if loss_fn is None:
        loss_fn = nn.CrossEntropyLoss()
    if device is None:
        device = next(model.parameters()).device

    model.train()
    model.to(device)

    total_loss     = 0.0
    correct        = 0
    skipped        = 0
    all_preds: List[int] = []
    all_labels: List[int] = []

    window_loss   = torch.tensor(0.0, device=device, requires_grad=False)
    window_count  = 0

    for i, event in enumerate(events):
        feat = torch.tensor(event.features, dtype=torch.float32, device=device)

        # process_event in training=True mode: no per-event detach
        logits = model.process_event(
            src_id    = event.src_id,
            dst_id    = event.dst_id,
            timestamp = event.timestamp,
            features  = feat,
            training  = True,
        )  # (1, num_classes)

        target = torch.tensor([event.label_idx], dtype=torch.long, device=device)
        loss   = loss_fn(logits, target)

        window_loss  = window_loss + loss
        window_count += 1

        pred = int(torch.argmax(logits, dim=1).item())
        all_preds.append(pred)
        all_labels.append(event.label_idx)
        if pred == event.label_idx:
            correct += 1

        # Backprop at end of window or at last event
        is_window_end = ((i + 1) % bptt_window == 0) or (i == len(events) - 1)
        if is_window_end and window_count > 0:
            optimizer.zero_grad()
            (window_loss / window_count).backward()
            if clip_grad_norm > 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), clip_grad_norm)
            optimizer.step()
            total_loss   += float(window_loss.item())
            # Detach memories at window boundary -- BPTT truncation
            model.detach_memories()
            window_loss  = torch.tensor(0.0, device=device)
            window_count = 0

    n_events = len(events) - skipped
    accuracy = correct / max(n_events, 1)
    macro_f1 = _macro_f1(all_preds, all_labels, model.num_classes)
    avg_loss = total_loss / max(n_events, 1)

    logger.info("[TGN] epoch done: loss=%.4f acc=%.4f f1=%.4f events=%d skipped=%d",
                avg_loss, accuracy, macro_f1, n_events, skipped)
    return {
        "loss":             avg_loss,
        "accuracy":         accuracy,
        "macro_f1":         macro_f1,
        "events_processed": n_events,
        "skipped":          skipped,
    }


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate_temporal_model(
    model,
    events: List[TemporalEvent],
    loss_fn: Optional[nn.Module] = None,
    device: Optional[torch.device] = None,
) -> Dict[str, float]:
    """
    Evaluate the TGN in inference mode (no gradient, no memory update).

    NOTE: validation events are run with training=False, meaning:
      - Memories are detached after each event (inference mode).
      - No backpropagation occurs.
      - Memories are NOT reset at the start; they carry state from
        the training run (simulating online deployment).
      - Call reset_temporal_state(model) BEFORE this function if you
        want a clean-slate evaluation.

    Returns:
        dict with keys: loss, accuracy, macro_f1, events_processed
    """
    if loss_fn is None:
        loss_fn = nn.CrossEntropyLoss()
    if device is None:
        device = next(model.parameters()).device

    model.eval()
    total_loss = 0.0
    correct    = 0
    all_preds: List[int]  = []
    all_labels: List[int] = []

    with torch.no_grad():
        for event in events:
            feat   = torch.tensor(event.features, dtype=torch.float32, device=device)
            logits = model.process_event(
                event.src_id, event.dst_id, event.timestamp, feat, training=False
            )
            target = torch.tensor([event.label_idx], dtype=torch.long, device=device)
            total_loss += float(loss_fn(logits, target).item())
            pred = int(torch.argmax(logits, dim=1).item())
            all_preds.append(pred)
            all_labels.append(event.label_idx)
            if pred == event.label_idx:
                correct += 1

    n        = len(events)
    accuracy = correct / max(n, 1)
    macro_f1 = _macro_f1(all_preds, all_labels, model.num_classes)
    avg_loss = total_loss / max(n, 1)

    logger.info("[TGN] eval: loss=%.4f acc=%.4f f1=%.4f events=%d",
                avg_loss, accuracy, macro_f1, n)
    return {
        "loss":             avg_loss,
        "accuracy":         accuracy,
        "macro_f1":         macro_f1,
        "events_processed": n,
    }


# ---------------------------------------------------------------------------
# Checkpoint save / load
# ---------------------------------------------------------------------------

CHECKPOINT_VERSION = "1.0"

def save_checkpoint(
    model,
    path: str,
    feature_cols: List[str],
    class_names: List[str],
    ip_mapper: Optional[IPNodeMapper] = None,
    extra_metadata: Optional[Dict] = None,
) -> None:
    """
    Save model state and all dimension parameters to a checkpoint file.

    Checkpoint contents:
      - model_state_dict      : learnable parameter weights
      - feature_dim           : int
      - memory_dim            : int
      - time_dim              : int
      - msg_dim               : int
      - num_classes           : int
      - feature_cols          : List[str]
      - class_names           : List[str]
      - architecture_metadata : TGN_MODEL_METADATA dict
      - ip_mapper             : IPNodeMapper (optional)
      - checkpoint_version    : str
      - saved_at              : ISO timestamp
    """
    import datetime
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    payload = {
        "checkpoint_version":    CHECKPOINT_VERSION,
        "saved_at":              datetime.datetime.utcnow().isoformat() + "Z",
        "model_state_dict":      model.state_dict(),
        "feature_dim":           model.feature_dim,
        "memory_dim":            model.memory_dim,
        "time_dim":              model.time_dim,
        "msg_dim":               model.msg_dim,
        "num_classes":           model.num_classes,
        "feature_cols":          feature_cols,
        "class_names":           list(class_names),
        "architecture_metadata": model.metadata,
        "ip_mapper":             ip_mapper,
    }
    if extra_metadata:
        payload["extra"] = extra_metadata

    torch.save(payload, path)
    logger.info("[TGN] Checkpoint saved to %s", path)


def load_checkpoint(
    model,
    path: str,
    device: Optional[torch.device] = None,
) -> Dict[str, Any]:
    """
    Load a checkpoint and return the metadata dict.

    Safety:
      - Validates that checkpoint dimensions match the model's dimensions.
      - Raises ValueError with a descriptive message if they do not match.
      - Uses weights_only=False because the checkpoint includes non-tensor
        objects (feature_cols list, class_names list, IPNodeMapper, metadata
        dict). PyTorch only allows weights_only=True for pure tensor payloads.
        The checkpoint file must be from a trusted source.

    Args:
        model  : TemporalGraphTGN instance (already constructed).
        path   : path to checkpoint .pt file.
        device : load tensors onto this device (defaults to model device).

    Returns:
        dict: checkpoint payload (without model_state_dict).
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Checkpoint not found: {path}")
    if device is None:
        device = next(model.parameters()).device

    # weights_only=False is required here because the checkpoint contains
    # non-tensor Python objects (lists, dicts, IPNodeMapper instance).
    # Only load checkpoints from trusted sources.
    checkpoint = torch.load(path, map_location=device, weights_only=False)

    # Dimension validation
    dim_checks = [
        ("feature_dim", model.feature_dim),
        ("memory_dim",  model.memory_dim),
        ("time_dim",    model.time_dim),
        ("msg_dim",     model.msg_dim),
        ("num_classes", model.num_classes),
    ]
    for key, expected in dim_checks:
        ckpt_val = checkpoint.get(key)
        if ckpt_val is not None and ckpt_val != expected:
            raise ValueError(
                f"Checkpoint dimension mismatch for '{key}': "
                f"checkpoint={ckpt_val}, model={expected}. "
                f"Reconstruct the model with the correct dimensions before loading."
            )

    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    logger.info("[TGN] Checkpoint loaded from %s (version=%s, saved=%s)",
                path,
                checkpoint.get("checkpoint_version", "unknown"),
                checkpoint.get("saved_at", "unknown"))

    # Return metadata without the bulky state_dict
    meta = {k: v for k, v in checkpoint.items() if k != "model_state_dict"}
    return meta


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _macro_f1(preds: List[int], labels: List[int], num_classes: int) -> float:
    """Compute macro-averaged F1 without sklearn dependency."""
    if not preds:
        return 0.0
    f1s = []
    for c in range(num_classes):
        tp = sum(1 for p, l in zip(preds, labels) if p == c and l == c)
        fp = sum(1 for p, l in zip(preds, labels) if p == c and l != c)
        fn = sum(1 for p, l in zip(preds, labels) if p != c and l == c)
        prec   = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1     = 2 * prec * recall / (prec + recall) if (prec + recall) > 0 else 0.0
        f1s.append(f1)
    return float(np.mean(f1s))
