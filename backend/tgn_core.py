"""
backend/tgn_core.py  -- Genuine TGN core for SentinelGraph
Architecture class:  simplified_TGN  (not a full Rossi et al. 2020 reproduction)
"""

import logging
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger("sentinelgraph.tgn_core")

# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------
TGN_MODEL_METADATA: Dict = {
    "model_type": "Temporal Graph Network",
    "architecture": "simplified_TGN",
    "memory_enabled": True,
    "time_encoding_enabled": True,
    "message_function_enabled": True,
    "message_aggregation_enabled": True,
    "gru_memory_update_enabled": True,
    "graph_interaction_enabled": True,
    "forecast_type": "baseline_temporal_forecast",
    "note": (
        "Simplified TGN: single-hop src/dst interaction messages. "
        "Multi-hop graph attention (Rossi et al. 2020) not implemented."
    ),
}

DEFAULT_MEMORY_DIM = 64
DEFAULT_TIME_DIM   = 16
DEFAULT_MSG_DIM    = 64
DEFAULT_HIDDEN_DIM = 64
DEFAULT_MAX_EDGES  = 50


# ===========================================================================
# 1. NodeMemory
# ===========================================================================
class NodeMemory:
    """
    Dictionary-backed per-node memory store.

    Detach policy
    -------------
    Inference / replay : call detach_all() after EACH event.
    Training           : call detach_all() only at the END of each truncated
                         BPTT window (not after every event -- that destroys
                         temporal gradients within the window).
    """

    def __init__(self, memory_dim: int = DEFAULT_MEMORY_DIM,
                 device: torch.device = None):
        self.memory_dim = memory_dim
        self.device = device or torch.device("cpu")
        self._memories: Dict[int, torch.Tensor] = {}
        self._last_timestamps: Dict[int, float] = {}

    def get(self, node_id: int) -> torch.Tensor:
        if node_id not in self._memories:
            self._memories[node_id] = torch.zeros(
                self.memory_dim, dtype=torch.float32, device=self.device
            )
        return self._memories[node_id]

    def set(self, node_id: int, memory: torch.Tensor) -> None:
        self._memories[node_id] = memory

    def get_last_timestamp(self, node_id: int) -> float:
        return self._last_timestamps.get(node_id, 0.0)

    def set_last_timestamp(self, node_id: int, ts: float) -> None:
        self._last_timestamps[node_id] = ts

    def reset(self) -> None:
        self._memories.clear()
        self._last_timestamps.clear()

    def detach_all(self) -> None:
        """
        Detach stored memories from the computation graph.
        INFERENCE: call after each event.
        TRAINING:  call only at the end of each BPTT window.
        """
        for nid in list(self._memories.keys()):
            self._memories[nid] = self._memories[nid].detach()

    @property
    def known_nodes(self) -> List[int]:
        return list(self._memories.keys())


# ===========================================================================
# 2. TimeEncoder
# ===========================================================================
class TimeEncoder(nn.Module):
    """
    Learnable sinusoidal time encoding (Time2Vec, Kazemi et al., 2019).
    Output shape: (batch_size, time_dim)
    """

    def __init__(self, time_dim: int = DEFAULT_TIME_DIM):
        super().__init__()
        self.time_dim = time_dim
        self.w = nn.Parameter(torch.randn(time_dim))
        self.b = nn.Parameter(torch.zeros(time_dim))

    def forward(self, delta_t: torch.Tensor) -> torch.Tensor:
        if delta_t.dim() == 0:
            delta_t = delta_t.unsqueeze(0)
        t = delta_t.unsqueeze(-1) * self.w.unsqueeze(0) + self.b.unsqueeze(0)
        return torch.sin(t)  # (batch, time_dim)


# ===========================================================================
# 3. TemporalEdgeStore
# ===========================================================================
@dataclass
class TemporalEdge:
    neighbor_id: int
    timestamp: float
    features: np.ndarray
    direction: str   # "outgoing" | "incoming"


class TemporalEdgeStore:
    """
    Bounded per-node history of recent temporal interactions.

    Provides temporal context for forecasting and future multi-hop extensions.
    In the current simplified_TGN the main message comes from the direct
    src/dst interaction; this store is ready for graph-attention extensions.
    """

    def __init__(self, max_edges_per_node: int = DEFAULT_MAX_EDGES):
        self.max_edges = max_edges_per_node
        self._store: Dict[int, deque] = defaultdict(
            lambda: deque(maxlen=self.max_edges)
        )

    def add_edge(self, src_id: int, dst_id: int,
                 timestamp: float, features: np.ndarray) -> None:
        self._store[src_id].append(
            TemporalEdge(dst_id, timestamp, features, "outgoing")
        )
        self._store[dst_id].append(
            TemporalEdge(src_id, timestamp, features, "incoming")
        )

    def get_recent_edges(self, node_id: int, n: int = 10) -> List[TemporalEdge]:
        return list(self._store.get(node_id, []))[-n:]

    def reset(self) -> None:
        self._store.clear()


# ===========================================================================
# 4. MessageFunction
# ===========================================================================
class MessageFunction(nn.Module):
    """
    Temporal message from:
      previous_src_mem + previous_dst_mem + current_features + time_encoding
    -> msg (msg_dim)

    Architecture: Linear -> BN -> ReLU -> Linear
    """

    def __init__(self, memory_dim: int = DEFAULT_MEMORY_DIM,
                 feature_dim: int = 29, time_dim: int = DEFAULT_TIME_DIM,
                 msg_dim: int = DEFAULT_MSG_DIM):
        super().__init__()
        in_dim = memory_dim + memory_dim + feature_dim + time_dim
        self.fc1 = nn.Linear(in_dim, msg_dim * 2)
        self.fc2 = nn.Linear(msg_dim * 2, msg_dim)
        self.bn  = nn.BatchNorm1d(msg_dim * 2)

    def forward(self, src_mem: torch.Tensor, dst_mem: torch.Tensor,
                features: torch.Tensor, time_enc: torch.Tensor) -> torch.Tensor:
        x = torch.cat([src_mem, dst_mem, features, time_enc], dim=-1)
        h = self.fc1(x)
        if h.shape[0] > 1:
            h = self.bn(h)
        return self.fc2(F.relu(h))


# ===========================================================================
# 5. MessageAggregator
# ===========================================================================
class MessageAggregator(nn.Module):
    """Mean aggregation of multiple messages for the same node."""

    def __init__(self):
        super().__init__()

    def forward(self, messages: List[torch.Tensor]) -> torch.Tensor:
        if not messages:
            raise ValueError("MessageAggregator: empty list")
        return torch.stack(messages, dim=0).mean(dim=0)


# ===========================================================================
# 6. MemoryUpdater (GRUCell)
# ===========================================================================
class MemoryUpdater(nn.Module):
    """new_memory = GRUCell(aggregated_message, previous_memory)"""

    def __init__(self, msg_dim: int = DEFAULT_MSG_DIM,
                 memory_dim: int = DEFAULT_MEMORY_DIM):
        super().__init__()
        self.gru = nn.GRUCell(input_size=msg_dim, hidden_size=memory_dim)

    def forward(self, agg_msg: torch.Tensor,
                prev_memory: torch.Tensor) -> torch.Tensor:
        return self.gru(agg_msg.unsqueeze(0), prev_memory.unsqueeze(0)).squeeze(0)


# ===========================================================================
# 7. PredictionHead
# ===========================================================================
class PredictionHead(nn.Module):
    """
    Classify using PREVIOUS (pre-update) memories only -- no leakage.

    Input: prev_src_mem + prev_dst_mem + current_features + time_encoding
    -> logits (num_classes)
    """

    def __init__(self, memory_dim: int = DEFAULT_MEMORY_DIM,
                 feature_dim: int = 29, time_dim: int = DEFAULT_TIME_DIM,
                 hidden_dim: int = DEFAULT_HIDDEN_DIM, num_classes: int = 5,
                 dropout: float = 0.3):
        super().__init__()
        in_dim = memory_dim + memory_dim + feature_dim + time_dim
        self.fc1     = nn.Linear(in_dim, hidden_dim)
        self.fc2     = nn.Linear(hidden_dim, hidden_dim // 2)
        self.fc3     = nn.Linear(hidden_dim // 2, num_classes)
        self.dropout = nn.Dropout(dropout)

    def forward(self, src_mem: torch.Tensor, dst_mem: torch.Tensor,
                features: torch.Tensor, time_enc: torch.Tensor) -> torch.Tensor:
        x = torch.cat([src_mem, dst_mem, features, time_enc], dim=-1)
        h = F.relu(self.fc1(x))
        h = self.dropout(h)
        h = F.relu(self.fc2(h))
        return self.fc3(h)   # raw logits


# ===========================================================================
# 8. TemporalGraphTGN  -- orchestrator
# ===========================================================================
class TemporalGraphTGN(nn.Module):
    """
    Temporal Graph Network orchestrator.

    Guaranteed event-processing order:
      Step 1  Read previous src/dst memories
      Step 2  Compute time encoding from previous timestamps
      Step 3  Create temporal message
      Step 4  PREDICT using previous memories only    <- no leakage
      Step 5  Update src/dst memories via GRU
      Step 6  Store current timestamp
      Step 7  Store temporal edge in history

    Detach policy:
      training=False  ->  detach memories inside process_event (inference)
      training=True   ->  DO NOT detach per-event; detach only at end of
                          truncated BPTT window in train_tgn.py
    """

    def __init__(self, feature_dim: int = 29,
                 memory_dim: int = DEFAULT_MEMORY_DIM,
                 time_dim:   int = DEFAULT_TIME_DIM,
                 msg_dim:    int = DEFAULT_MSG_DIM,
                 hidden_dim: int = DEFAULT_HIDDEN_DIM,
                 num_classes: int = 5, dropout: float = 0.3,
                 max_edges_per_node: int = DEFAULT_MAX_EDGES):
        super().__init__()
        self.feature_dim = feature_dim
        self.memory_dim  = memory_dim
        self.time_dim    = time_dim
        self.msg_dim     = msg_dim
        self.num_classes = num_classes

        self.time_encoder    = TimeEncoder(time_dim)
        self.message_fn      = MessageFunction(memory_dim, feature_dim, time_dim, msg_dim)
        self.msg_aggregator  = MessageAggregator()
        self.memory_updater  = MemoryUpdater(msg_dim, memory_dim)
        self.prediction_head = PredictionHead(
            memory_dim, feature_dim, time_dim, hidden_dim, num_classes, dropout
        )
        self.node_memory = NodeMemory(memory_dim)
        self.edge_store  = TemporalEdgeStore(max_edges_per_node)

        self.metadata = dict(TGN_MODEL_METADATA)
        self.metadata.update({
            "feature_dim": feature_dim, "memory_dim": memory_dim,
            "time_dim": time_dim, "msg_dim": msg_dim,
            "num_classes": num_classes,
        })

    def process_event(self, src_id: int, dst_id: int, timestamp: float,
                      features: torch.Tensor, training: bool = False
                      ) -> torch.Tensor:
        """
        Process ONE network-flow event chronologically.
        Returns logits of shape (1, num_classes).

        training=False : memories detached after update (inference / replay)
        training=True  : memories NOT detached (let train_tgn.py handle BPTT)
        """
        device = next(self.parameters()).device

        # Step 1 -- read previous memories
        prev_src_mem = self.node_memory.get(src_id).to(device)
        prev_dst_mem = self.node_memory.get(dst_id).to(device)

        # Step 2 -- time encoding from previous timestamps
        dt_src = torch.tensor(
            max(0.0, timestamp - self.node_memory.get_last_timestamp(src_id)),
            dtype=torch.float32, device=device,
        )
        dt_dst = torch.tensor(
            max(0.0, timestamp - self.node_memory.get_last_timestamp(dst_id)),
            dtype=torch.float32, device=device,
        )
        time_enc = self.time_encoder(dt_src).squeeze(0)  # (time_dim,)

        feat_2d     = features.unsqueeze(0).to(device)   # (1, feature_dim)
        src_mem_2d  = prev_src_mem.unsqueeze(0)           # (1, memory_dim)
        dst_mem_2d  = prev_dst_mem.unsqueeze(0)           # (1, memory_dim)
        time_enc_2d = time_enc.unsqueeze(0)               # (1, time_dim)

        # Step 3 -- temporal message
        msg      = self.message_fn(src_mem_2d, dst_mem_2d, feat_2d, time_enc_2d)
        agg_msg  = self.msg_aggregator([msg.squeeze(0)])  # (msg_dim,)

        # Step 4 -- PREDICT with previous memories (before update)
        logits = self.prediction_head(src_mem_2d, dst_mem_2d, feat_2d, time_enc_2d)

        # Step 5 -- update memories via GRU
        new_src_mem = self.memory_updater(agg_msg, prev_src_mem)
        new_dst_mem = self.memory_updater(agg_msg, prev_dst_mem)

        # Step 6 -- store timestamps
        self.node_memory.set_last_timestamp(src_id, timestamp)
        self.node_memory.set_last_timestamp(dst_id, timestamp)

        # Step 7 -- store temporal edge; detach in inference mode
        if not training:
            new_src_mem = new_src_mem.detach()
            new_dst_mem = new_dst_mem.detach()
        self.node_memory.set(src_id, new_src_mem)
        self.node_memory.set(dst_id, new_dst_mem)
        self.edge_store.add_edge(src_id, dst_id, timestamp,
                                 features.detach().cpu().numpy())
        return logits  # (1, num_classes)

    def forward_batch(self, src_ids: List[int], dst_ids: List[int],
                      timestamps: List[float], features: torch.Tensor,
                      training: bool = False) -> torch.Tensor:
        """Process N events chronologically. timestamps MUST be sorted."""
        return torch.cat([
            self.process_event(src_ids[i], dst_ids[i], timestamps[i],
                               features[i], training)
            for i in range(len(src_ids))
        ], dim=0)

    def reset_state(self) -> None:
        self.node_memory.reset()
        self.edge_store.reset()

    def detach_memories(self) -> None:
        """
        Detach memories from the computation graph.
        INFERENCE:  called automatically inside process_event.
        TRAINING:   call at the end of each truncated BPTT window only.
        """
        self.node_memory.detach_all()


# ===========================================================================
# 9. forecast_next_window  -- honest baseline forecast
# ===========================================================================
def forecast_next_window(
    recent_events: List[Dict],
    window_minutes: int = 5,
    class_names: Optional[List[str]] = None,
) -> Dict:
    """
    Baseline temporal forecast for the next N minutes.

    forecast_type is always "baseline_temporal_forecast".
    This is NOT a trained future-prediction model.
    """
    if class_names is None:
        class_names = ["BENIGN", "DoS", "DDoS", "PortScan", "Infiltration"]

    if not recent_events:
        return {
            "forecast_type": "baseline_temporal_forecast",
            "window_minutes": window_minutes,
            "predicted_risk": 0,
            "risk_trend": "stable",
            "attack_probability": 0.0,
            "dominant_attack": "Unknown",
            "repeated_pairs": 0,
            "confidence": "low",
            "note": "No recent events available for forecast.",
        }

    n           = len(recent_events)
    risk_scores = [float(e.get("risk_score", 0.0)) for e in recent_events]
    labels      = [str(e.get("label", "Benign"))   for e in recent_events]

    attack_count = sum(1 for l in labels if l.lower() != "benign")
    attack_freq  = attack_count / max(n, 1)

    half       = max(n // 2, 1)
    early_risk = float(np.mean(risk_scores[:half])) if risk_scores[:half] else 0.0
    late_risk  = float(np.mean(risk_scores[half:])) if risk_scores[half:] else 0.0
    risk_trend = ("rising" if late_risk > early_risk * 1.1
                  else "falling" if late_risk < early_risk * 0.9
                  else "stable")

    pair_counts: Dict[Tuple[str, str], int] = {}
    for e in recent_events:
        pair = (str(e.get("src_ip", "?")), str(e.get("dst_ip", "?")))
        pair_counts[pair] = pair_counts.get(pair, 0) + 1
    repeated_pairs = sum(1 for c in pair_counts.values() if c > 1)

    pkt_rates  = [float(e["flow_pkts_s"])  for e in recent_events if e.get("flow_pkts_s")]
    byte_rates = [float(e["flow_byts_s"])  for e in recent_events if e.get("flow_byts_s")]

    attack_labels   = [l for l in labels if l.lower() != "benign"]
    dominant_attack = Counter(attack_labels).most_common(1)[0][0] if attack_labels else "None"

    base_risk      = float(np.mean(risk_scores)) if risk_scores else 0.0
    trend_adj      = 10.0 if risk_trend == "rising" else (-5.0 if risk_trend == "falling" else 0.0)
    predicted_risk = int(min(max(base_risk + trend_adj + attack_freq * 20.0
                                 + min(repeated_pairs * 3.0, 15.0), 0), 100))

    confidence     = "medium" if n >= 50 else ("low" if n >= 10 else "very_low")
    label_counter  = Counter(labels)

    return {
        "forecast_type":       "baseline_temporal_forecast",
        "window_minutes":      window_minutes,
        "predicted_risk":      predicted_risk,
        "risk_trend":          risk_trend,
        "attack_probability":  round(attack_freq, 4),
        "dominant_attack":     dominant_attack,
        "repeated_pairs":      repeated_pairs,
        "avg_pkt_rate":        round(float(np.mean(pkt_rates))  if pkt_rates  else 0.0, 4),
        "avg_byte_rate":       round(float(np.mean(byte_rates)) if byte_rates else 0.0, 4),
        "class_frequency":     {
            cls: round(label_counter.get(cls, 0) / max(n, 1), 4)
            for cls in class_names
        },
        "confidence":          confidence,
        "events_analysed":     n,
        "note": (
            "baseline_temporal_forecast -- uses recent event statistics only. "
            "NOT a trained future-prediction model."
        ),
    }
