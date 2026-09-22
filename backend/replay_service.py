import os
import io
import time
import threading
import logging
from datetime import datetime, timezone
import pandas as pd
import numpy as np

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.model_service import model_service
from backend.flow_processor import process_flow_row
from config import RAW_LABEL_TO_CATEGORY

logger = logging.getLogger("sentinelgraph.replay")

# Standard column mappings for flexible CSV support
COLUMN_ALIASES = {
    "timestamp": ["timestamp", "time", "date", "flow_timestamp"],
    "src_ip": ["src_ip_dec", "src ip", "source ip", "src_ip", "source_ip", "srcip", "sourceip"],
    "dst_ip": ["dst_ip_dec", "dst ip", "destination ip", "dst_ip", "destination_ip", "dstip", "destinationip"],
    "src_port": ["src_port", "src port", "source port", "source_port", "sport"],
    "dst_port": ["dst_port", "dst port", "destination port", "destination_port", "dport"],
    "protocol": ["protocol", "proto"],
    "label": ["label", "attack", "attack_type", "category", "class"]
}

def standardize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardizes alternate column names to SentinelGraph convention."""
    df.columns = df.columns.str.strip()
    col_map = {}
    lower_cols = {col.lower(): col for col in df.columns}
    
    for standard_name, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_cols:
                actual_col = lower_cols[alias]
                if standard_name == "timestamp" and "Timestamp" not in df.columns:
                    col_map[actual_col] = "Timestamp"
                elif standard_name == "src_ip" and "Src IP" not in df.columns and "Src_IP_dec" not in df.columns:
                    col_map[actual_col] = "Src IP"
                elif standard_name == "dst_ip" and "Dst IP" not in df.columns and "Dst_IP_dec" not in df.columns:
                    col_map[actual_col] = "Dst IP"
                elif standard_name == "src_port" and "Src Port" not in df.columns and "Src_Port" not in df.columns:
                    col_map[actual_col] = "Src Port"
                elif standard_name == "dst_port" and "Dst Port" not in df.columns and "Dst_Port" not in df.columns:
                    col_map[actual_col] = "Dst Port"
                elif standard_name == "protocol" and "Protocol" not in df.columns:
                    col_map[actual_col] = "Protocol"
                elif standard_name == "label" and "Label" not in df.columns:
                    col_map[actual_col] = "Label"
                break

    if col_map:
        df = df.rename(columns=col_map)
    return df


class ReplayManager:
    def __init__(self):
        self.is_running = False
        self.thread = None
        self.status = {
            "status": "Ready",
            "state": "Stopped",
            "dataset": None,
            "speed": 10.0,
            "total_rows": 0,
            "processed_rows": 0,
            "progress_percent": 0.0,
            "current_row": 0,
            "current_attack": "None",
            "started_at": None,
            "completed_at": None,
            "error": None,
            "flows_processed": 0,
            "total_flows": 0,
            "attacks_detected": 0,
            "current_risk": 0
        }

    def start(self, dataset: str, speed: float = 10.0):
        if self.is_running:
            return False, "Replay is already running"

        if speed <= 0:
            speed = 10.0

        now_str = datetime.now(timezone.utc).isoformat()
        self.status = {
            "status": "Processing",
            "state": "Running",
            "dataset": dataset,
            "speed": speed,
            "total_rows": 0,
            "processed_rows": 0,
            "progress_percent": 0.0,
            "current_row": 0,
            "current_attack": "None",
            "started_at": now_str,
            "completed_at": None,
            "error": None,
            "flows_processed": 0,
            "total_flows": 0,
            "attacks_detected": 0,
            "current_risk": 0
        }

        self.is_running = True
        self.thread = threading.Thread(target=self._run_replay, args=(dataset, speed))
        self.thread.daemon = True
        self.thread.start()

        return True, "Replay started"

    def stop(self):
        if not self.is_running:
            return False, "Replay is not running"

        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2.0)

        self.status["status"] = "Stopped"
        self.status["state"] = "Stopped"
        self.status["completed_at"] = datetime.now(timezone.utc).isoformat()
        return True, "Replay stopped"

    def get_status(self):
        return self.status

    def _resolve_file_path(self, dataset: str) -> str:
        # Check if direct absolute path
        if os.path.isabs(dataset) and os.path.exists(dataset):
            return dataset
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data")
        uploads_dir = os.path.join(data_dir, "uploads")

        # 1. Check relative to project root
        cand_base = os.path.join(base_dir, dataset)
        if os.path.exists(cand_base) and os.path.isfile(cand_base):
            return cand_base

        # 2. Check relative to data directory
        cand_data = os.path.join(data_dir, dataset)
        if os.path.exists(cand_data) and os.path.isfile(cand_data):
            return cand_data
            
        # 3. Check relative to uploads directory
        cand_upload = os.path.join(uploads_dir, dataset)
        if os.path.exists(cand_upload) and os.path.isfile(cand_upload):
            return cand_upload

        # 4. Check basename in data_dir
        cand_base_name = os.path.join(data_dir, os.path.basename(dataset))
        if os.path.exists(cand_base_name) and os.path.isfile(cand_base_name):
            return cand_base_name

        # 5. Check basename in uploads_dir
        cand_upload_name = os.path.join(uploads_dir, os.path.basename(dataset))
        if os.path.exists(cand_upload_name) and os.path.isfile(cand_upload_name):
            return cand_upload_name
            
        return cand_data

    def _run_replay(self, dataset: str, speed: float):
        try:
            file_path = self._resolve_file_path(dataset)

            if not os.path.exists(file_path):
                err_msg = f"Dataset file '{dataset}' not found at {file_path}"
                logger.error(err_msg)
                self.status["status"] = "Failed"
                self.status["state"] = "Error"
                self.status["error"] = err_msg
                self.status["completed_at"] = datetime.now(timezone.utc).isoformat()
                self.is_running = False
                return

            df = pd.read_csv(file_path)
            df = standardize_dataframe_columns(df)

            # Clean data
            df = df.dropna()
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            inf_mask = np.isinf(df[numeric_cols].values).any(axis=1)
            df = df[~inf_mask]

            if len(df) == 0:
                err_msg = "Dataset contains 0 valid numeric rows after cleaning."
                self.status["status"] = "Failed"
                self.status["state"] = "Error"
                self.status["error"] = err_msg
                self.status["completed_at"] = datetime.now(timezone.utc).isoformat()
                self.is_running = False
                return

            # Sort chronologically if Timestamp column is present
            has_timestamps = False
            if "Timestamp" in df.columns:
                try:
                    df["_parsed_ts"] = pd.to_datetime(df["Timestamp"], errors="coerce")
                    if df["_parsed_ts"].notna().sum() > 0:
                        df = df.sort_values("_parsed_ts")
                        has_timestamps = True
                except Exception as ex:
                    logger.warning(f"Could not parse Timestamp column: {ex}")

            df = df.reset_index(drop=True)
            total_count = len(df)
            self.status["total_rows"] = total_count
            self.status["total_flows"] = total_count

            if not model_service.is_loaded:
                model_service.load_models()

            features_to_use = [
                c for c in model_service.feature_cols
                if c in df.columns
            ]

            if len(features_to_use) == 0:
                missing_feats = model_service.feature_cols[:5]
                err_msg = f"No trained ML features found in dataset. Expected features like: {', '.join(missing_feats)}"
                logger.error(err_msg)
                self.status["status"] = "Failed"
                self.status["state"] = "Error"
                self.status["error"] = err_msg
                self.status["completed_at"] = datetime.now(timezone.utc).isoformat()
                self.is_running = False
                return

            alerted_attack_types = set()
            db: Session = SessionLocal()

            # Batch prediction in chunks to optimize ML throughput while streaming row-by-row
            chunk_size = 50
            try:
                for chunk_start in range(0, total_count, chunk_size):
                    if not self.is_running:
                        break

                    chunk_end = min(chunk_start + chunk_size, total_count)
                    chunk_df = df.iloc[chunk_start:chunk_end].copy()

                    predicted_labels, probabilities = model_service.predict_tgn(chunk_df, features_to_use)

                    for i, (_, row) in enumerate(chunk_df.iterrows()):
                        if not self.is_running:
                            break

                        current_row_idx = chunk_start + i + 1
                        row_dict = row.to_dict()
                        row_dict['predicted_label'] = predicted_labels[i]
                        row_dict['confidence'] = float(np.max(probabilities[i]))

                        res = process_flow_row(row_dict, db, alerted_attack_types, current_row_idx)

                        clean_label = res.get("clean_label", "BENIGN")
                        if res["attack_detected"]:
                            self.status["attacks_detected"] += 1

                        # Update real-time progress fields
                        self.status["current_row"] = current_row_idx
                        self.status["processed_rows"] = current_row_idx
                        self.status["flows_processed"] = current_row_idx
                        self.status["current_attack"] = clean_label
                        self.status["current_risk"] = res["risk_score"]
                        self.status["progress_percent"] = round((current_row_idx / total_count) * 100, 1)

                        # Commit periodically
                        if current_row_idx % 10 == 0:
                            db.commit()

                        # Sequential pacing: calculate timestamp difference or use speed delay
                        step_delay = 0.05 / speed
                        if has_timestamps and i < len(chunk_df) - 1:
                            try:
                                t1 = chunk_df.iloc[i].get("_parsed_ts")
                                t2 = chunk_df.iloc[i+1].get("_parsed_ts")
                                if pd.notna(t1) and pd.notna(t2):
                                    diff_sec = abs((t2 - t1).total_seconds())
                                    step_delay = max(0.005, min(diff_sec / speed, 0.2))
                            except Exception:
                                pass

                        time.sleep(step_delay)

                    db.commit()

            finally:
                db.close()

            if self.is_running:
                self.status["status"] = "Completed"
                self.status["state"] = "Completed"
                self.status["progress_percent"] = 100.0
                self.status["completed_at"] = datetime.now(timezone.utc).isoformat()
                self.is_running = False

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Error in replay thread: {e}")
            self.status["status"] = "Failed"
            self.status["state"] = "Error"
            self.status["error"] = str(e)
            self.status["completed_at"] = datetime.now(timezone.utc).isoformat()
            self.is_running = False


replay_manager = ReplayManager()
