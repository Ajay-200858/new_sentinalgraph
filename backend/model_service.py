"""
backend/model_service.py
========================
ModelService for SentinelGraph — wraps the genuine TemporalGraphTGN.

PRIMARY DATASET
---------------
    data/sentinelgraph_real_temporal_10k.csv
    - 10,000 rows, 5 classes
    - Label column: Attack_Label  (clean 5-class)
    - Src/Dst node IDs: Src_IP_dec / Dst_IP_dec  (numeric, NOT fake IPs)
    - Real timestamps: Timestamp column (parsed with pandas)
    - Sorted chronologically BEFORE TGN training

FIVE CLASS ORDER (explicit, not alphabetical)
---------------------------------------------
    Index  Class
    -----  -----------
    0      BENIGN
    1      DoS
    2      DDoS
    3      PortScan
    4      Infiltration

PUBLIC API (identical to previous version; main.py requires zero changes)
-------------------------------------------------------------------------
  model_service.is_loaded           -> bool
  model_service.feature_cols        -> List[str]
  model_service.load_models()       -> bool
  model_service.predict_tgn(df, features_to_use)
                                    -> (np.array[str], np.array[N, 5])
  model_service.calculate_risk(prediction_class, confidence)
                                    -> (int, str)
  model_service.get_explanation(prediction_class)
                                    -> List[str]
  model_service.get_mitre_tactic(prediction_class)
                                    -> str
"""

import logging
import os
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from backend.tgn_core import TemporalGraphTGN, TGN_MODEL_METADATA, forecast_next_window
from backend.train_tgn import IPNodeMapper, build_temporal_events
from config import (
    CLASS_NAMES, CLASS_TO_IDX, IDX_TO_CLASS, NUM_CLASSES,
    CATEGORY_TO_MITRE, RAW_LABEL_TO_CATEGORY,
)

logger = logging.getLogger("sentinelgraph.model_service")

# ---------------------------------------------------------------------------
# Canonical class definition (must match config.py exactly)
# ---------------------------------------------------------------------------
# BENIGN=0, DoS=1, DDoS=2, PortScan=3, Infiltration=4
_CLASS_NAMES  = CLASS_NAMES     # ["BENIGN", "DoS", "DDoS", "PortScan", "Infiltration"]
_CLASS_TO_IDX = CLASS_TO_IDX   # {str -> int}
_IDX_TO_CLASS = IDX_TO_CLASS   # {int -> str}
_NUM_CLASSES  = NUM_CLASSES     # 5

# Primary dataset path
_PRIMARY_DATASET = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "sentinelgraph_real_temporal_10k.csv"
)

# Columns in the new real temporal dataset
_LABEL_COL   = "Attack_Label"   # 5-class clean label
_TS_COL      = "Timestamp"      # real timestamps
_SRC_IP_COL  = "Src_IP_dec"     # numeric IP (used as node ID)
_DST_IP_COL  = "Dst_IP_dec"     # numeric IP (used as node ID)


class ModelService:
    """
    Singleton model service. Initialised on import; loaded on first request
    via load_models() (called from FastAPI startup event in main.py).

    Class ordering is EXPLICIT — never rely on sklearn's alphabetical ordering.
    """

    def __init__(self):
        self.scaler  = StandardScaler()
        self.rf      = RandomForestClassifier(
            n_estimators=100, max_depth=15, random_state=42, n_jobs=-1
        )
        self.lr      = LogisticRegression(
            max_iter=1000, solver="lbfgs", random_state=42
        )
        self.tgn_model: Optional[TemporalGraphTGN] = None
        self.ip_mapper   = IPNodeMapper()
        self.device      = torch.device("cpu")
        self.is_loaded   = False
        self.feature_cols: Optional[List[str]] = None
        self.tgn_metadata: Dict = dict(TGN_MODEL_METADATA)

        # Explicit 5-class state (not derived from LabelEncoder)
        self.class_names: List[str] = list(_CLASS_NAMES)
        self.class_to_idx: Dict[str, int] = dict(_CLASS_TO_IDX)
        self.idx_to_class: Dict[int, str] = dict(_IDX_TO_CLASS)
        self.num_classes: int = _NUM_CLASSES

        # Risk severity per class
        self.severity_base = {
            "BENIGN":       0,
            "DoS":          80,
            "DDoS":         90,
            "PortScan":     50,
            "Infiltration": 95,
            # Legacy aliases
            "Benign":       0,
            "BruteForce":   60,
            "WebAttack":    70,
            "Bot":          85,
        }

    # ------------------------------------------------------------------
    # load_models
    # ------------------------------------------------------------------

    def load_models(self) -> bool:
        """
        Load and train all models from the primary real temporal dataset.

        Key behaviour
        -------------
        - Uses Attack_Label column (5-class clean labels)
        - Uses Src_IP_dec / Dst_IP_dec as integer node IDs (no fake IPs)
        - Uses Timestamp column for real temporal ordering
        - Sorts chronologically before TGN training
        - Class ordering is explicit {BENIGN:0, DoS:1, DDoS:2, PortScan:3, Infiltration:4}
        - Sklearn RandomForest and LR are also trained with this mapping
        """
        logger.info("ModelService.load_models() starting (5-class mode) ...")

        csv_path = _PRIMARY_DATASET

        # Fall back to old smoke-test CSVs if primary is missing
        if not os.path.exists(csv_path):
            repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            fallbacks = [
                os.path.join(repo_root, "data",
                             "cic_ids2017_tgn_smoke_test_10k_balanced__1_.csv"),
                os.path.join(repo_root, "data",
                             "cic_ids2017_tgn_smoke_test_10k.csv"),
            ]
            csv_path = next((p for p in fallbacks if os.path.exists(p)), None)
            if csv_path:
                logger.warning(
                    "Primary dataset not found. Falling back to: %s", csv_path
                )
            else:
                logger.warning(
                    "No dataset found. Models will be untrained. "
                    "Upload a CSV via /api/v1/upload to start inference."
                )
                return False

        # ── Load and clean ────────────────────────────────────────────────
        logger.info("Loading dataset: %s", csv_path)
        df = pd.read_csv(csv_path)
        df.columns = df.columns.str.strip()
        df = df.dropna()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        inf_mask = np.isinf(df[numeric_cols].values).any(axis=1)
        df = df[~inf_mask].reset_index(drop=True)

        # ── Determine label column ─────────────────────────────────────────
        if _LABEL_COL in df.columns:
            label_col = _LABEL_COL
        elif "Label" in df.columns:
            label_col = "Label"
            logger.warning(
                "Using 'Label' column (not 'Attack_Label'). "
                "This may be the old 4-class dataset."
            )
        else:
            logger.error("No label column found in dataset. Aborting.")
            return False

        # ── Sort chronologically (REQUIRED by TGN) ─────────────────────────
        if _TS_COL in df.columns:
            logger.info("Sorting %d rows by %s ...", len(df), _TS_COL)
            df[_TS_COL] = pd.to_datetime(df[_TS_COL], errors="coerce")
            df = df.dropna(subset=[_TS_COL])
            df = df.sort_values(_TS_COL).reset_index(drop=True)
            logger.info("Chronological sort complete.")
        else:
            logger.warning(
                "Timestamp column '%s' not found. "
                "Events will be processed in file order.", _TS_COL
            )

        # ── Build explicit 5-class label mapping ───────────────────────────
        # Do NOT let sklearn assign class indices — use our fixed mapping.
        known_labels = set(df[label_col].unique())
        for lbl in known_labels:
            if lbl not in self.class_to_idx:
                logger.warning(
                    "Label '%s' in dataset is NOT in CLASS_TO_IDX. "
                    "Rows with this label will be skipped during TGN training.", lbl
                )

        # ── Feature columns (all numeric except label and ID cols) ──────────
        id_cols_to_exclude = {label_col, "Label", "Attempted_Category",
                               _SRC_IP_COL, _DST_IP_COL}
        self.feature_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in id_cols_to_exclude
        ]

        logger.info("Feature columns: %d", len(self.feature_cols))
        logger.info("Classes: %s (%d)", self.class_names, self.num_classes)

        X = df[self.feature_cols].values.astype(np.float32)

        # ── Build y with EXPLICIT class ordering ────────────────────────────
        # Replace any label not in our mapping with BENIGN and warn
        def safe_encode(lbl: str) -> int:
            if lbl in self.class_to_idx:
                return self.class_to_idx[lbl]
            # Try RAW_LABEL_TO_CATEGORY mapping (old variants)
            mapped = RAW_LABEL_TO_CATEGORY.get(lbl)
            if mapped and mapped in self.class_to_idx:
                return self.class_to_idx[mapped]
            logger.warning(
                "Label '%s' not in 5-class mapping. Encoding as BENIGN(0).", lbl
            )
            return 0

        y_encoded = np.array([safe_encode(lbl) for lbl in df[label_col]], dtype=np.int64)

        X_scaled = self.scaler.fit_transform(X)

        # ── Sklearn baseline models (use integer y directly) ─────────────────
        logger.info("Training RandomForest ...")
        self.rf.fit(X_scaled, y_encoded)
        logger.info("Training LogisticRegression ...")
        self.lr.fit(X_scaled, y_encoded)

        # ── TGN (temporal, chronological) ────────────────────────────────
        logger.info("Training TGN (simplified_TGN, %d events) ...", len(df))
        feature_dim = len(self.feature_cols)
        self.tgn_model = TemporalGraphTGN(
            feature_dim=feature_dim,
            num_classes=self.num_classes,   # 5
        ).to(self.device)

        # Determine source/destination node ID columns
        has_src_ip = _SRC_IP_COL in df.columns
        has_dst_ip = _DST_IP_COL in df.columns
        has_ts     = _TS_COL in df.columns and pd.api.types.is_datetime64_any_dtype(df[_TS_COL])

        events = build_temporal_events(
            df            = df,
            feature_cols  = self.feature_cols,
            label_col     = label_col,
            ip_mapper     = self.ip_mapper,
            label_to_idx  = self.class_to_idx,
            timestamp_col = _TS_COL if has_ts else None,
            src_ip_col    = _SRC_IP_COL if has_src_ip else None,
            dst_ip_col    = _DST_IP_COL if has_dst_ip else None,
        )

        if not events:
            logger.warning("No valid training events built. TGN will be untrained.")
        else:
            optimizer = torch.optim.Adam(self.tgn_model.parameters(), lr=1e-3)
            loss_fn   = nn.CrossEntropyLoss()

            self.tgn_model.reset_state()
            self.tgn_model.train()

            BPTT_WINDOW = 100
            n_events = len(events)
            window_loss_acc = torch.tensor(0.0, device=self.device)
            window_count    = 0
            total_events    = 0

            for i, ev in enumerate(events):
                feat_raw = ev.features  # (feature_dim,) float32
                feat_scaled = self.scaler.transform(
                    feat_raw.reshape(1, -1)
                ).flatten().astype(np.float32)
                feat_t = torch.tensor(feat_scaled, dtype=torch.float32,
                                      device=self.device)
                target = torch.tensor([ev.label_idx], dtype=torch.long,
                                      device=self.device)

                logits = self.tgn_model.process_event(
                    src_id    = ev.src_id,
                    dst_id    = ev.dst_id,
                    timestamp = ev.timestamp,
                    features  = feat_t,
                    training  = True,
                )
                loss = loss_fn(logits, target)
                window_loss_acc = window_loss_acc + loss
                window_count   += 1
                total_events   += 1

                is_end = ((i + 1) % BPTT_WINDOW == 0) or (i == n_events - 1)
                if is_end:
                    optimizer.zero_grad()
                    (window_loss_acc / window_count).backward()
                    torch.nn.utils.clip_grad_norm_(
                        self.tgn_model.parameters(), max_norm=1.0
                    )
                    optimizer.step()
                    self.tgn_model.detach_memories()
                    window_loss_acc = torch.tensor(0.0, device=self.device)
                    window_count    = 0

            logger.info("TGN training complete (%d events processed).", total_events)

        self.tgn_metadata = dict(self.tgn_model.metadata) if self.tgn_model else {}
        self.is_loaded = True
        logger.info("ModelService.load_models() complete (5 classes).")
        return True

    # ------------------------------------------------------------------
    # predict_tgn
    # ------------------------------------------------------------------

    def predict_tgn(
        self,
        df: pd.DataFrame,
        features_to_use: List[str],
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Run TGN inference on a DataFrame of network flows.

        The DataFrame rows are processed as a temporal sequence.
        Each event uses the PREVIOUS node memory to predict (no leakage).
        Memories are detached after each event (inference mode).

        Node IDs are derived from Src_IP_dec / Dst_IP_dec if present;
        otherwise deterministic fallbacks are used and logged.

        Args:
            df              : cleaned DataFrame.
            features_to_use : list of feature column names present in df.

        Returns:
            predicted_labels : np.ndarray[str], shape (N,)
            probabilities    : np.ndarray[float32], shape (N, 5)

        Class order in probabilities[:,c]:
            0=BENIGN, 1=DoS, 2=DDoS, 3=PortScan, 4=Infiltration
        """
        if not self.is_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        df = df.reset_index(drop=True)

        # ── Feature alignment with training ──────────────────────────────
        available_cols = [c for c in features_to_use if c in df.columns]
        X = df[available_cols].values.astype(np.float32)
        n_train_features = len(self.feature_cols)

        if X.shape[1] < n_train_features:
            pad = np.zeros((X.shape[0], n_train_features - X.shape[1]), dtype=np.float32)
            X = np.hstack((X, pad))
        elif X.shape[1] > n_train_features:
            X = X[:, :n_train_features]

        X_scaled = self.scaler.transform(X).astype(np.float32)

        # ── Node ID columns (Src_IP_dec / Dst_IP_dec) ────────────────────
        has_src = _SRC_IP_COL in df.columns
        has_dst = _DST_IP_COL in df.columns
        has_ts  = _TS_COL in df.columns

        if not has_src:
            logger.warning(
                "[TGN predict] '%s' not found — using fallback node IDs. "
                "These do NOT represent real IPs.", _SRC_IP_COL
            )
        if not has_dst:
            logger.warning(
                "[TGN predict] '%s' not found — using fallback node IDs. "
                "These do NOT represent real IPs.", _DST_IP_COL
            )
        if not has_ts:
            logger.warning(
                "[TGN predict] '%s' not found — using replay timestamps.", _TS_COL
            )

        # ── Sort by timestamp before inference (temporal ordering) ────────
        if has_ts:
            df = df.copy()
            df[_TS_COL] = pd.to_datetime(df[_TS_COL], errors="coerce")
            orig_idx = df.index.tolist()
            df_sorted = df.sort_values(_TS_COL).reset_index(drop=False)
            sort_order = df_sorted["index"].tolist()
            df = df_sorted.drop(columns=["index"])
            X_scaled = X_scaled[sort_order]

        # ── TGN inference ─────────────────────────────────────────────────
        if self.tgn_model is not None:
            self.tgn_model.eval()
            all_probs: List[np.ndarray] = []
            all_preds: List[int]        = []

            base_ts = 1_700_000_000.0  # fallback epoch

            with torch.no_grad():
                for i, (_, row) in enumerate(df.iterrows()):
                    # Real node IDs from Src_IP_dec / Dst_IP_dec
                    if has_src:
                        src_val = int(row[_SRC_IP_COL])
                        src_id  = self.ip_mapper.get_or_create(str(src_val))
                    else:
                        src_id = self.ip_mapper.get_or_create(f"_fallback_src_{i % 255}")

                    if has_dst:
                        dst_val = int(row[_DST_IP_COL])
                        dst_id  = self.ip_mapper.get_or_create(str(dst_val))
                    else:
                        dst_id = self.ip_mapper.get_or_create(f"_fallback_dst_{i % 255}")

                    if has_ts:
                        ts = float(row[_TS_COL].timestamp()) if not pd.isna(row[_TS_COL]) else base_ts + i
                    else:
                        ts = base_ts + i * 1.0

                    feat_t = torch.tensor(
                        X_scaled[i], dtype=torch.float32, device=self.device
                    )

                    logits = self.tgn_model.process_event(
                        src_id=src_id, dst_id=dst_id,
                        timestamp=ts, features=feat_t,
                        training=False,
                    )  # (1, 5)

                    probs = F.softmax(logits, dim=1).cpu().numpy()[0]
                    pred  = int(np.argmax(probs))
                    all_probs.append(probs)
                    all_preds.append(pred)

            probabilities    = np.array(all_probs, dtype=np.float32)
            pred_indices     = np.array(all_preds, dtype=np.int64)
            predicted_labels = np.array(
                [self.idx_to_class.get(p, "BENIGN") for p in pred_indices]
            )
            return predicted_labels, probabilities

        # ── Fallback: RandomForest ────────────────────────────────────────
        logger.warning("[TGN predict] TGN model is None — falling back to RandomForest.")
        rf_probs  = self._rf_predict_proba_5class(X_scaled)
        rf_preds  = np.argmax(rf_probs, axis=1)
        predicted_labels = np.array(
            [self.idx_to_class.get(p, "BENIGN") for p in rf_preds]
        )
        return predicted_labels, rf_probs

    def _rf_predict_proba_5class(self, X_scaled: np.ndarray) -> np.ndarray:
        """
        Get 5-class probabilities from RandomForest, mapping RF class indices
        to our explicit class ordering. RF may not have seen all 5 classes if
        the training set was imbalanced — missing classes get prob 0.
        """
        rf_classes    = self.rf.classes_.tolist()   # indices seen by RF
        rf_raw        = self.rf.predict_proba(X_scaled)  # (N, len(rf_classes))
        out           = np.zeros((X_scaled.shape[0], self.num_classes), dtype=np.float32)
        for col_i, rf_cls_idx in enumerate(rf_classes):
            if rf_cls_idx < self.num_classes:
                out[:, rf_cls_idx] = rf_raw[:, col_i]
        # Renormalize rows to sum to 1
        row_sums = out.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1.0
        return out / row_sums

    # ------------------------------------------------------------------
    # Risk / explanation / MITRE helpers  (unchanged API)
    # ------------------------------------------------------------------

    def calculate_risk(self, prediction_class: str, confidence: float
                       ) -> Tuple[int, str]:
        base = self.severity_base.get(prediction_class, 50)
        if prediction_class in ("BENIGN", "Benign"):
            return 0, "LOW"

        risk_score = int(base * (0.6 + 0.4 * float(confidence)))

        if risk_score < 30:
            severity = "LOW"
        elif risk_score < 60:
            severity = "MEDIUM"
        elif risk_score < 85:
            severity = "HIGH"
        else:
            severity = "CRITICAL"

        return risk_score, severity

    def get_explanation(self, prediction_class: str) -> List[str]:
        explanations = {
            "BENIGN": [
                "Normal traffic patterns observed",
                "Routine connection frequency",
            ],
            "Benign": [
                "Normal traffic patterns observed",
                "Routine connection frequency",
            ],
            "DoS": [
                "High traffic volume detected",
                "Abnormal packet rate observed",
                "Temporal pattern consistent with Denial-of-Service",
            ],
            "DDoS": [
                "Distributed high-volume traffic detected",
                "Multiple source IPs targeting the same destination",
                "Temporal pattern consistent with Distributed DoS",
            ],
            "PortScan": [
                "Sequential port access pattern detected",
                "Low bytes-per-connection ratio",
                "Reconnaissance behaviour identified",
            ],
            "Infiltration": [
                "Lateral movement indicators detected",
                "Unusual internal connection patterns",
                "Possible post-exploitation data staging",
                "Temporal pattern consistent with Infiltration",
            ],
        }
        return explanations.get(prediction_class, [
            "Suspicious traffic characteristics detected"
        ])

    def get_mitre_tactic(self, prediction_class: str) -> str:
        return CATEGORY_TO_MITRE.get(prediction_class,
               CATEGORY_TO_MITRE.get("BENIGN", "Benign"))

    def get_mitre_technique(self, prediction_class: str) -> str:
        techniques = {
            "DoS": "T1498 (Network Denial of Service)",
            "DDoS": "T1498 (Network Denial of Service)",
            "PortScan": "T1046 (Network Service Discovery)",
            "Infiltration": "T1210 (Exploitation of Remote Services)",
            "BruteForce": "T1110 (Brute Force)",
            "WebAttack": "T1190 (Exploit Public-Facing Application)",
            "Bot": "T1071 (Application Layer Protocol)",
        }
        return techniques.get(prediction_class, "Technique not mapped")

    # ------------------------------------------------------------------
    # Optional: get_forecast
    # ------------------------------------------------------------------

    def get_forecast(self, recent_events: List[Dict]) -> Dict:
        """
        Produce a baseline_temporal_forecast from recent event dicts.
        """
        return forecast_next_window(
            recent_events  = recent_events,
            window_minutes = 5,
            class_names    = self.class_names,  # 5-class
        )


# Singleton instance imported by main.py
model_service = ModelService()
