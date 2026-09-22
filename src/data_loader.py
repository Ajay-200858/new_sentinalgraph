"""
SentinelGraph — Data Loader
============================
Download, load, and clean CIC-IDS-2018 CSV files.

This module handles:
1. Downloading CSVs from AWS S3 (or HTTP fallback)
2. Loading & cleaning (Inf/NaN handling, column normalization)
3. Label normalization (15+ raw sub-labels → 7 clean categories)
4. Balanced sampling for prototype speed
5. Synthetic data generation as ultimate fallback
"""

import os
import sys
import subprocess
import warnings
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    DATA_RAW_DIR,
    COL_TIMESTAMP, COL_SRC_IP, COL_DST_IP, COL_SRC_PORT, COL_DST_PORT,
    COL_PROTOCOL, COL_LABEL,
    EDGE_FEATURE_COLS,
    RAW_LABEL_TO_CATEGORY,
    CLASS_TO_IDX,
    CATEGORY_TO_ID,
    TARGET_CSV_FILES,
    S3_BUCKET, S3_PREFIX,
)
from src.utils import get_logger, timer

logger = get_logger("data_loader")

# Suppress pandas warnings about mixed types
warnings.filterwarnings("ignore", category=pd.errors.DtypeWarning)


# ═══════════════════════════════════════════════════════════════
#  DOWNLOAD
# ═══════════════════════════════════════════════════════════════

def download_from_s3(filename: str, dest_dir: Path = DATA_RAW_DIR) -> Path:
    """
    Download a CIC-IDS-2018 CSV from the AWS S3 bucket.

    Uses `aws s3 cp --no-sign-request` (no AWS account needed).
    Falls back to generating synthetic data if AWS CLI is not available.

    Parameters
    ----------
    filename : str
        Name of the CSV file to download.
    dest_dir : Path
        Local directory to save the file.

    Returns
    -------
    Path
        Path to the downloaded (or generated) file.
    """
    dest_path = dest_dir / filename
    if dest_path.exists():
        logger.info(f"File already exists: {dest_path}")
        return dest_path

    dest_dir.mkdir(parents=True, exist_ok=True)
    s3_path = f"s3://{S3_BUCKET}/{S3_PREFIX}{filename}"

    logger.info(f"Attempting S3 download: {s3_path}")
    try:
        result = subprocess.run(
            ["aws", "s3", "cp", "--no-sign-request", s3_path, str(dest_path)],
            capture_output=True, text=True, timeout=600,  # 10 min timeout
        )
        if result.returncode == 0 and dest_path.exists():
            size_mb = dest_path.stat().st_size / (1024 * 1024)
            logger.info(f"Downloaded successfully: {size_mb:.1f} MB")
            return dest_path
        else:
            logger.warning(f"S3 download failed: {result.stderr.strip()}")
    except FileNotFoundError:
        logger.warning("AWS CLI not found - skipping S3 download")
    except subprocess.TimeoutExpired:
        logger.warning("S3 download timed out")
    except Exception as e:
        logger.warning(f"S3 download error: {e}")

    # Fallback: generate synthetic data
    logger.info("Generating synthetic CSV as fallback...")
    return generate_synthetic_csv(dest_path)


def generate_synthetic_csv(dest_path: Path, n_rows: int = 50_000) -> Path:
    """
    Generate a synthetic CIC-IDS-2018 CSV with realistic schema and
    feature distributions. Used as a guaranteed-to-work fallback when
    the real data can't be downloaded.

    Parameters
    ----------
    dest_path : Path
        Where to save the synthetic CSV.
    n_rows : int
        Number of rows to generate.

    Returns
    -------
    Path
        Path to the generated file.
    """
    rng = np.random.RandomState(42)

    # Generate realistic IP addresses for a small corporate network
    src_ips = [f"172.31.69.{i}" for i in range(10, 30)]
    dst_ips = [f"18.219.{rng.randint(0,255)}.{rng.randint(1,255)}" for _ in range(50)]
    internal_ips = [f"172.31.69.{i}" for i in range(10, 50)]

    # Assign labels with realistic class imbalance (80% benign)
    n_benign = int(n_rows * 0.80)
    n_brute = int(n_rows * 0.08)
    n_dos = int(n_rows * 0.05)
    n_ddos = int(n_rows * 0.03)
    n_bot = int(n_rows * 0.02)
    n_infil = int(n_rows * 0.01)
    n_web = n_rows - n_benign - n_brute - n_dos - n_ddos - n_bot - n_infil

    labels = (
        ["Benign"] * n_benign
        + ["FTP-BruteForce"] * (n_brute // 2)
        + ["SSH-Bruteforce"] * (n_brute - n_brute // 2)
        + ["DoS attacks-Hulk"] * (n_dos // 2)
        + ["DoS attacks-SlowHTTPTest"] * (n_dos - n_dos // 2)
        + ["DDoS attacks-LOIC-HTTP"] * n_ddos
        + ["Bot"] * n_bot
        + ["Infilteration"] * n_infil
        + ["Brute Force -XSS"] * n_web
    )
    rng.shuffle(labels)

    # Generate timestamps spanning 4 hours with realistic flow ordering
    base_ts = pd.Timestamp("2018-02-14 09:00:00")
    timestamps = [
        base_ts + pd.Timedelta(seconds=i * (4 * 3600 / n_rows))
        for i in range(n_rows)
    ]

    data = {
        COL_TIMESTAMP: [t.strftime("%d/%m/%Y %H:%M:%S") for t in timestamps],
        "Flow ID": [f"flow_{i}" for i in range(n_rows)],
        COL_SRC_IP: rng.choice(src_ips, n_rows),
        COL_SRC_PORT: rng.randint(1024, 65535, n_rows),
        COL_DST_IP: rng.choice(dst_ips + internal_ips, n_rows),
        COL_DST_PORT: rng.choice([22, 80, 443, 21, 8080, 3389, 53], n_rows),
        COL_PROTOCOL: rng.choice([6, 17, 6, 6, 6], n_rows),  # mostly TCP
        COL_LABEL: labels,
    }

    # Generate numeric features with label-dependent distributions
    for i, label in enumerate(labels):
        is_attack = label != "Benign"
        is_dos = "DoS" in label or "DDoS" in label
        is_brute = "Brute" in label or "SSH" in label
        is_bot = label == "Bot"

        # Attack traffic has different statistical signatures
        if is_dos:
            data.setdefault("Flow Duration", []).append(rng.exponential(50000))
            data.setdefault("Tot Fwd Pkts", []).append(rng.randint(100, 10000))
            data.setdefault("Tot Bwd Pkts", []).append(rng.randint(0, 10))
            data.setdefault("Flow Byts/s", []).append(rng.exponential(500000))
            data.setdefault("Flow Pkts/s", []).append(rng.exponential(5000))
        elif is_brute:
            data.setdefault("Flow Duration", []).append(rng.exponential(200000))
            data.setdefault("Tot Fwd Pkts", []).append(rng.randint(5, 50))
            data.setdefault("Tot Bwd Pkts", []).append(rng.randint(3, 30))
            data.setdefault("Flow Byts/s", []).append(rng.exponential(1000))
            data.setdefault("Flow Pkts/s", []).append(rng.exponential(10))
        elif is_bot:
            data.setdefault("Flow Duration", []).append(rng.exponential(100000))
            data.setdefault("Tot Fwd Pkts", []).append(rng.randint(2, 20))
            data.setdefault("Tot Bwd Pkts", []).append(rng.randint(2, 20))
            data.setdefault("Flow Byts/s", []).append(rng.exponential(500))
            data.setdefault("Flow Pkts/s", []).append(rng.exponential(5))
        else:
            data.setdefault("Flow Duration", []).append(rng.exponential(500000))
            data.setdefault("Tot Fwd Pkts", []).append(rng.randint(1, 30))
            data.setdefault("Tot Bwd Pkts", []).append(rng.randint(1, 20))
            data.setdefault("Flow Byts/s", []).append(rng.exponential(10000))
            data.setdefault("Flow Pkts/s", []).append(rng.exponential(50))

    # Fill remaining feature columns with plausible values
    feature_defaults = {
        "TotLen Fwd Pkts": lambda: rng.exponential(2000, n_rows),
        "TotLen Bwd Pkts": lambda: rng.exponential(1500, n_rows),
        "Fwd Pkt Len Max": lambda: rng.randint(0, 1500, n_rows).astype(float),
        "Fwd Pkt Len Mean": lambda: rng.exponential(200, n_rows),
        "Bwd Pkt Len Max": lambda: rng.randint(0, 1500, n_rows).astype(float),
        "Bwd Pkt Len Mean": lambda: rng.exponential(200, n_rows),
        "Flow IAT Mean": lambda: rng.exponential(100000, n_rows),
        "Flow IAT Std": lambda: rng.exponential(50000, n_rows),
        "Flow IAT Max": lambda: rng.exponential(200000, n_rows),
        "Flow IAT Min": lambda: rng.exponential(10, n_rows),
        "Fwd IAT Tot": lambda: rng.exponential(100000, n_rows),
        "Fwd IAT Mean": lambda: rng.exponential(50000, n_rows),
        "Fwd PSH Flags": lambda: rng.randint(0, 2, n_rows).astype(float),
        "Bwd PSH Flags": lambda: rng.randint(0, 2, n_rows).astype(float),
        "Fwd Header Len": lambda: rng.randint(20, 60, n_rows).astype(float),
        "Bwd Header Len": lambda: rng.randint(20, 60, n_rows).astype(float),
        "FIN Flag Cnt": lambda: rng.randint(0, 2, n_rows).astype(float),
        "SYN Flag Cnt": lambda: rng.randint(0, 2, n_rows).astype(float),
        "RST Flag Cnt": lambda: rng.randint(0, 2, n_rows).astype(float),
        "ACK Flag Cnt": lambda: rng.randint(0, 2, n_rows).astype(float),
        "Init Fwd Win Byts": lambda: rng.randint(-1, 65535, n_rows).astype(float),
        "Init Bwd Win Byts": lambda: rng.randint(-1, 65535, n_rows).astype(float),
    }

    for col, gen_fn in feature_defaults.items():
        if col not in data:
            data[col] = gen_fn()

    df = pd.DataFrame(data)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(dest_path, index=False)
    size_mb = dest_path.stat().st_size / (1024 * 1024)
    logger.info(f"Synthetic CSV generated: {dest_path.name} ({size_mb:.1f} MB, {n_rows:,} rows)")
    return dest_path


# ═══════════════════════════════════════════════════════════════
#  LOAD & CLEAN
# ═══════════════════════════════════════════════════════════════

def load_and_clean(
    filepath: Path | str,
    max_rows: Optional[int] = None,
) -> pd.DataFrame:
    """
    Load a CIC-IDS-2018 CSV, clean it, and return a normalized DataFrame.

    Steps:
    1. Read CSV with appropriate dtypes
    2. Strip whitespace from column names
    3. Parse timestamps
    4. Handle Inf/NaN values
    5. Normalize labels to clean categories
    6. Select relevant columns
    7. Sort by timestamp

    Parameters
    ----------
    filepath : Path or str
        Path to the CSV file.
    max_rows : int, optional
        If set, only read this many rows (for quick testing).

    Returns
    -------
    pd.DataFrame
        Cleaned DataFrame ready for graph construction.
    """
    filepath = Path(filepath)
    logger.info(f"Loading {filepath.name}...")

    with timer("CSV read", logger):
        df = pd.read_csv(
            filepath,
            nrows=max_rows,
            low_memory=False,
            encoding="utf-8",
            on_bad_lines="skip",
        )

    original_shape = df.shape
    logger.info(f"Raw shape: {original_shape[0]:,} rows x {original_shape[1]} cols")

    # ── 1. Strip whitespace from column names ────────────────
    df.columns = df.columns.str.strip()

    # ── 2. Parse timestamps ──────────────────────────────────
    if COL_TIMESTAMP in df.columns:
        # Try multiple timestamp formats found in CIC-IDS-2018
        for fmt in ["%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M:%S",
                     "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M"]:
            try:
                df[COL_TIMESTAMP] = pd.to_datetime(df[COL_TIMESTAMP], format=fmt)
                logger.info(f"Timestamp parsed with format: {fmt}")
                break
            except (ValueError, TypeError):
                continue
        else:
            # Last resort: let pandas infer the format
            df[COL_TIMESTAMP] = pd.to_datetime(df[COL_TIMESTAMP], errors="coerce")
            logger.warning("Timestamp format inferred by pandas (may be slow)")
    else:
        logger.warning(f"Column '{COL_TIMESTAMP}' not found - creating sequential timestamps")
        df[COL_TIMESTAMP] = pd.date_range("2018-02-14 09:00:00", periods=len(df), freq="100ms")

    # Drop rows with unparseable timestamps
    n_null_ts = df[COL_TIMESTAMP].isna().sum()
    if n_null_ts > 0:
        logger.warning(f"Dropping {n_null_ts:,} rows with null timestamps")
        df = df.dropna(subset=[COL_TIMESTAMP])

    # ── 3. Handle Inf/NaN in numeric columns ─────────────────
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        # Replace Inf with NaN, then fill NaN with column median
        inf_count = np.isinf(df[col].values).sum() if df[col].dtype != object else 0
        if inf_count > 0:
            df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        nan_count = df[col].isna().sum()
        if nan_count > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if not np.isnan(median_val) else 0)

    # ── 4. Normalize labels ──────────────────────────────────
    label_col_found = None
    if COL_LABEL in df.columns:
        label_col_found = COL_LABEL
    elif "Label" in df.columns:
        label_col_found = "Label"

    if label_col_found is not None:
        df[label_col_found] = df[label_col_found].astype(str).str.strip()
        df["label_category"] = df[label_col_found].map(RAW_LABEL_TO_CATEGORY)

        # Handle any unmapped labels
        unmapped = df["label_category"].isna()
        if unmapped.any():
            unmapped_labels = df.loc[unmapped, label_col_found].unique()
            logger.warning(f"Unmapped labels found (mapped to 'BENIGN'): {unmapped_labels}")
            df.loc[unmapped, "label_category"] = "BENIGN"

        df["label_id"] = df["label_category"].map(CLASS_TO_IDX).fillna(0).astype(int)
    else:
        logger.warning(f"Label column not found - defaulting all to BENIGN")
        df[COL_LABEL] = "BENIGN"
        df["label_category"] = "BENIGN"
        df["label_id"] = 0

    # ── 5. Ensure IP columns exist ───────────────────────────
    if COL_SRC_IP not in df.columns and "Src_IP_dec" in df.columns:
        df[COL_SRC_IP] = df["Src_IP_dec"].astype(str)
    if COL_DST_IP not in df.columns and "Dst_IP_dec" in df.columns:
        df[COL_DST_IP] = df["Dst_IP_dec"].astype(str)

    for col in [COL_SRC_IP, COL_DST_IP]:
        if col not in df.columns:
            logger.warning(f"Column '{col}' not found - generating placeholder IPs")
            df[col] = [f"10.0.0.{i % 256}" for i in range(len(df))]

    # ── 6. Ensure feature columns exist ──────────────────────
    for col in EDGE_FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0
        else:
            # Force numeric type
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # ── 7. Sort by timestamp ─────────────────────────────────
    df = df.sort_values(COL_TIMESTAMP).reset_index(drop=True)

    final_shape = df.shape
    logger.info(
        f"Cleaned shape: {final_shape[0]:,} rows x {final_shape[1]} cols "
        f"(dropped {original_shape[0] - final_shape[0]:,} rows)"
    )

    return df


def get_label_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """Return a summary DataFrame of label counts and percentages."""
    dist = df["label_category"].value_counts().reset_index()
    dist.columns = ["Category", "Count"]
    dist["Percentage"] = (dist["Count"] / dist["Count"].sum() * 100).round(2)
    return dist.sort_values("Count", ascending=False).reset_index(drop=True)


def sample_balanced(
    df: pd.DataFrame,
    n_per_class: int = 5000,
    preserve_temporal_order: bool = True,
) -> pd.DataFrame:
    """
    Take a stratified sample preserving temporal order within each class.

    Parameters
    ----------
    df : pd.DataFrame
        Full cleaned DataFrame.
    n_per_class : int
        Max samples per attack category. Classes with fewer samples are
        kept in full.
    preserve_temporal_order : bool
        If True, takes the first n_per_class rows per class (preserving
        time order). If False, samples randomly.

    Returns
    -------
    pd.DataFrame
        Sampled DataFrame, sorted by timestamp.
    """
    sampled_parts = []
    for category in df["label_category"].unique():
        subset = df[df["label_category"] == category]
        if len(subset) <= n_per_class:
            sampled_parts.append(subset)
        elif preserve_temporal_order:
            # Take evenly spaced samples to cover the full time range
            indices = np.linspace(0, len(subset) - 1, n_per_class, dtype=int)
            sampled_parts.append(subset.iloc[indices])
        else:
            sampled_parts.append(subset.sample(n=n_per_class, random_state=42))

    result = pd.concat(sampled_parts).sort_values(COL_TIMESTAMP).reset_index(drop=True)
    logger.info(f"Sampled: {len(result):,} rows ({len(df):,} original)")
    return result


# ═══════════════════════════════════════════════════════════════
#  CONVENIENCE: FULL PIPELINE
# ═══════════════════════════════════════════════════════════════

def load_dataset(
    filename: str = "data/sentinelgraph_real_temporal_10k.csv",
    max_rows: Optional[int] = None,
    sample_size: Optional[int] = None,
) -> pd.DataFrame:
    """
    Full pipeline: download (if needed) → load → clean → optionally sample.

    Parameters
    ----------
    filename : str
        CSV filename to download/load.
    max_rows : int, optional
        Limit rows during CSV read (faster for testing).
    sample_size : int, optional
        If set, apply balanced sampling with this many rows per class.

    Returns
    -------
    pd.DataFrame
        Ready-to-use DataFrame.
    """
    filepath = Path(filename)
    if not filepath.is_absolute():
        project_root = Path(__file__).parent.parent
        filepath = project_root / filename

    if not filepath.exists():
        filepath = download_from_s3(filename)
    df = load_and_clean(filepath, max_rows=max_rows)

    if sample_size:
        df = sample_balanced(df, n_per_class=sample_size)

    return df


if __name__ == "__main__":
    # Quick smoke test
    print("=" * 60)
    print("  SentinelGraph Data Loader — Smoke Test")
    print("=" * 60)

    df = load_dataset(max_rows=10_000)
    print(f"\nDataset shape: {df.shape}")
    print(f"Time range: {df[COL_TIMESTAMP].min()} -> {df[COL_TIMESTAMP].max()}")
    print(f"\nLabel distribution:")
    print(get_label_distribution(df).to_string(index=False))
    print(f"\nFirst 3 rows:")
    cols_to_print = [c for c in [COL_TIMESTAMP, COL_SRC_IP, COL_DST_IP, COL_DST_PORT, COL_LABEL, "label_category", "label_id"] if c in df.columns]
    print(df[cols_to_print].head(3))
