"""
SentinelGraph — Global Configuration
=====================================
All tunable constants in one place. Import this everywhere.
"""

from pathlib import Path

# ── Paths ────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
DATA_RAW_DIR = PROJECT_ROOT / "data" / "raw"
DATA_PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
MODELS_DIR = PROJECT_ROOT / "models"
DEMO_DIR = PROJECT_ROOT / "demo"

# Create directories if they don't exist
for d in [DATA_RAW_DIR, DATA_PROCESSED_DIR, MODELS_DIR, DEMO_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ── Sliding Window Parameters ───────────────────────────────
WINDOW_SIZE_SEC = 60        # seconds per graph snapshot
WINDOW_OVERLAP_SEC = 0      # non-overlapping by default


# ── Dataset Column Names ────────────────────────────────────
# Primary dataset: sentinelgraph_real_temporal_10k.csv
# These are the authoritative column names for the new real temporal dataset.
COL_TIMESTAMP  = "Timestamp"
COL_SRC_IP_DEC = "Src_IP_dec"     # numeric IP representation
COL_DST_IP_DEC = "Dst_IP_dec"     # numeric IP representation
COL_SRC_PORT   = "Src_Port"
COL_DST_PORT   = "Dst_Port"
COL_PROTOCOL   = "Protocol"
COL_LABEL      = "Attack_Label"   # 5-class clean label column
COL_RAW_LABEL  = "Label"          # raw granular label (multi-variant)

# Legacy column names kept for backwards compatibility with old CIC-IDS-2018 files
COL_SRC_IP     = "Src IP"
COL_DST_IP     = "Dst IP"

# Primary dataset path (relative to project root)
PRIMARY_DATASET = "data/sentinelgraph_real_temporal_10k.csv"

# Numeric feature columns selected for edge features
# These are the most informative CICFlowMeter features for attack detection
EDGE_FEATURE_COLS = [
    "Dst Port",
    "Protocol",
    "Flow Duration",
    "Tot Fwd Pkts",
    "Tot Bwd Pkts",
    "TotLen Fwd Pkts",
    "TotLen Bwd Pkts",
    "Fwd Pkt Len Max",
    "Fwd Pkt Len Mean",
    "Bwd Pkt Len Max",
    "Bwd Pkt Len Mean",
    "Flow Byts/s",
    "Flow Pkts/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Tot",
    "Fwd IAT Mean",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd Header Len",
    "Bwd Header Len",
    "FIN Flag Cnt",
    "SYN Flag Cnt",
    "RST Flag Cnt",
    "ACK Flag Cnt",
    "Init Fwd Win Byts",
    "Init Bwd Win Byts",
]


# ── Label Normalization ─────────────────────────────────────
# Maps every raw label variant to an authoritative 5-class category.
# The new dataset uses Attack_Label (already clean) as the primary label.
# RAW_LABEL_TO_CATEGORY is kept for backwards compatibility when processing
# the raw 'Label' column or older CIC-IDS datasets.
RAW_LABEL_TO_CATEGORY = {
    # Benign
    "Benign":                            "BENIGN",
    "BENIGN":                            "BENIGN",
    "BENIGN":                            "BENIGN",

    # Recon / PortScan
    "PortScan":                          "PortScan",
    "Portscan":                          "PortScan",
    "PortScan":                          "PortScan",

    # DoS (all CIC-IDS DoS sub-variants → DoS)
    "DoS attacks-GoldenEye":             "DoS",
    "DoS attacks-Slowloris":             "DoS",
    "DoS attacks-SlowHTTPTest":          "DoS",
    "DoS attacks-Hulk":                  "DoS",
    "DoS Hulk":                          "DoS",
    "DoS GoldenEye":                     "DoS",
    "DoS Slowloris":                     "DoS",
    "DoS Slowhttptest":                  "DoS",
    "DoS Slowhttptest - Attempted":      "DoS",
    "DoS Slowloris - Attempted":         "DoS",
    "DoS Hulk - Attempted":              "DoS",
    "DoS GoldenEye - Attempted":         "DoS",

    # DDoS
    "DDoS attacks-LOIC-HTTP":            "DDoS",
    "DDoS attack-LOIC-UDP":              "DDoS",
    "DDoS attack-HOIC":                  "DDoS",
    "DDOS attack-LOIC-UDP":              "DDoS",
    "DDOS attack-HOIC":                  "DDoS",
    "DDoS":                              "DDoS",

    # Infiltration (new dataset variant)
    "Infiltration":                      "Infiltration",
    "Infilteration":                     "Infiltration",
    "Infiltration - Portscan":           "Infiltration",

    # Passthrough for already-clean 5-class labels
    "BENIGN":                            "BENIGN",
    "DoS":                               "DoS",
    "DDoS":                              "DDoS",
    "PortScan":                          "PortScan",
    "Infiltration":                      "Infiltration",
}

# ── Five-class explicit ordered mapping ─────────────────────
# Canonical order is fixed and must NOT change: alphabetical sorting would
# place DDoS before DoS, but we preserve this explicit order for model
# output compatibility across checkpoints.
#
# Index 0: BENIGN
# Index 1: DoS
# Index 2: DDoS
# Index 3: PortScan
# Index 4: Infiltration

CLASS_NAMES: list = ["BENIGN", "DoS", "DDoS", "PortScan", "Infiltration"]

CLASS_TO_IDX: dict = {
    "BENIGN":       0,
    "DoS":          1,
    "DDoS":         2,
    "PortScan":     3,
    "Infiltration": 4,
}

IDX_TO_CLASS: dict = {v: k for k, v in CLASS_TO_IDX.items()}

NUM_CLASSES: int = len(CLASS_NAMES)   # 5

# Legacy mappings kept for backward compatibility
# (these old names were used in the CIC-IDS-2018 7-class mapping)
CATEGORY_TO_ID = {
    "Benign":       0,
    "BruteForce":   1,
    "DoS":          2,
    "DDoS":         3,
    "WebAttack":    4,
    "Bot":          5,
    "Infiltration": 6,
}
ID_TO_CATEGORY = {v: k for k, v in CATEGORY_TO_ID.items()}


# ── MITRE ATT&CK Stage Mapping ──────────────────────────────
# Maps each 5-class attack category to a high-level ATT&CK tactic.
# DoS/DDoS → "Impact" (TA0040)  |  Infiltration → "Lateral Movement" (TA0008)
CATEGORY_TO_MITRE = {
    # Primary 5-class labels
    "BENIGN":       "Benign",
    "DoS":          "Impact",
    "DDoS":         "Impact",
    "PortScan":     "Reconnaissance",
    "Infiltration": "Lateral Movement",
    # Legacy / alias
    "Benign":       "Benign",
    "BruteForce":   "Initial Access",
    "WebAttack":    "Initial Access",
    "Bot":          "Command & Control",
}

# Color coding for the Streamlit UI badges
MITRE_STAGE_COLORS = {
    "Benign":             "#22c55e",   # green
    "Reconnaissance":     "#eab308",   # yellow
    "Initial Access":     "#f97316",   # orange
    "Lateral Movement":   "#f97316",   # orange
    "Command & Control":  "#ef4444",   # red
    "Impact":             "#ef4444",   # red
    "Exfiltration":       "#dc2626",   # dark red
}

# Risk scores for the probability-over-time chart (0-1 scale)
MITRE_STAGE_RISK = {
    "Benign":             0.0,
    "Reconnaissance":     0.2,
    "Initial Access":     0.4,
    "Lateral Movement":   0.6,
    "Command & Control":  0.8,
    "Impact":             0.9,
    "Exfiltration":       1.0,
}


# ── Data Download URLs ──────────────────────────────────────
# Primary: AWS S3 (no account needed)
S3_BUCKET = "cse-cic-ids2018"
S3_PREFIX = "Processed Traffic Data for ML Algorithms/"

# Target files for download (prioritized for attack diversity)
TARGET_CSV_FILES = [
    "Wednesday-14-02-2018_TrafficForML_CICFlowMeter.csv",   # Brute Force (Phase 1)
    "Thursday-15-02-2018_TrafficForML_CICFlowMeter.csv",    # DoS attacks
    "Friday-16-02-2018_TrafficForML_CICFlowMeter.csv",      # DDoS attacks
    "Thursday-22-02-2018_TrafficForML_CICFlowMeter.csv",    # Brute Force Web + SQL Injection
    "Friday-23-02-2018_TrafficForML_CICFlowMeter.csv",      # Brute Force Web + SQL Injection
    "Wednesday-21-02-2018_TrafficForML_CICFlowMeter.csv",   # DDOS + Infiltration
    "Thursday-01-03-2018_TrafficForML_CICFlowMeter.csv",    # Infiltration
    "Friday-02-03-2018_TrafficForML_CICFlowMeter.csv",      # Bot
]
