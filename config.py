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


# ── CIC-IDS-2018 Column Names ───────────────────────────────
# Identifier columns (needed for graph construction, not for features)
COL_TIMESTAMP = "Timestamp"
COL_SRC_IP = "Src IP"
COL_DST_IP = "Dst IP"
COL_SRC_PORT = "Src Port"
COL_DST_PORT = "Dst Port"
COL_PROTOCOL = "Protocol"
COL_LABEL = "Label"

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
# Maps every raw CIC-IDS-2018 sub-label to a clean category name
RAW_LABEL_TO_CATEGORY = {
    # Benign
    "Benign":                   "Benign",

    # Brute Force
    "FTP-BruteForce":           "BruteForce",
    "SSH-Bruteforce":           "BruteForce",
    "SSH-BruteForce":           "BruteForce",  # seen in some files
    "Brute Force -Web":         "WebAttack",
    "Brute Force -XSS":        "WebAttack",

    # DoS
    "DoS attacks-GoldenEye":    "DoS",
    "DoS attacks-Slowloris":    "DoS",
    "DoS attacks-SlowHTTPTest": "DoS",
    "DoS attacks-Hulk":         "DoS",

    # DDoS
    "DDoS attacks-LOIC-HTTP":   "DDoS",
    "DDoS attack-LOIC-UDP":     "DDoS",
    "DDoS attack-HOIC":         "DDoS",
    "DDOS attack-LOIC-UDP":     "DDoS",  # case variant
    "DDOS attack-HOIC":         "DDoS",  # case variant

    # Web Attacks
    "SQL Injection":            "WebAttack",

    # Bot
    "Bot":                      "Bot",

    # Infiltration
    "Infilteration":            "Infiltration",
    "Infiltration":             "Infiltration",
}

# Integer encoding for model training
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

NUM_CLASSES = len(CATEGORY_TO_ID)


# ── MITRE ATT&CK Stage Mapping ──────────────────────────────
# Maps each attack category to a high-level ATT&CK tactic.
# NOTE: DoS/DDoS → "Impact" (TA0040), which is the correct ATT&CK tactic
# for service disruption. This is distinct from Exfiltration (TA0010).
CATEGORY_TO_MITRE = {
    "Benign":       "Benign",
    "BruteForce":   "Initial Access",
    "DoS":          "Impact",
    "DDoS":         "Impact",
    "WebAttack":    "Initial Access",
    "Bot":          "Command & Control",
    "Infiltration": "Lateral Movement",
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
