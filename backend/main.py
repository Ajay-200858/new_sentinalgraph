import logging
import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is explicitly loaded from project root
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")

import io
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db, engine
from backend.models import Base, NetworkFlow, Prediction, Forecast, SecurityEvent, Notification
from backend.schemas import SystemStatus, FlowUploadResponse, DashboardSummary
from backend.model_service import model_service
from backend import caspian_service
from config import RAW_LABEL_TO_CATEGORY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinelgraph")

app = FastAPI(title="SentinelGraph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Load ML models on startup
    model_service.load_models()
    # Initialise Caspian alerting (gracefully — never blocks startup)
    caspian_service.initialize_caspian()

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "disconnected"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    model_status = "loaded" if model_service.is_loaded else "unloaded"

    return {
        "status": "ok",
        "database": db_status,
        "models": model_status,
        "caspian": caspian_service.get_status(),
    }

@app.post("/api/v1/upload", response_model=FlowUploadResponse)
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="INVALID DATASET: File must be a CSV")
        
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        df.columns = df.columns.str.strip()
        
        # Verify required columns (or at least that it has features)
        if df.shape[1] < 10:
            raise HTTPException(status_code=400, detail="INVALID DATASET: Missing required columns")
            
        # Clean data as in data_loader
        df = df.dropna()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        inf_mask = np.isinf(df[numeric_cols].values).any(axis=1)
        df = df[~inf_mask]
        
        # Process up to 2500 rows to ensure qualifying attack samples are captured
        # while keeping response times fast
        if len(df) > 2500:
            df = df.head(2500)

        df = df.reset_index(drop=True)
            
        attacks_detected = 0
        high_risk_events = 0
        total_risk = 0
        
        if not model_service.is_loaded:
            raise HTTPException(status_code=500, detail="MODEL INFERENCE ERROR: Models not loaded")
            
        features_to_use = [
            c for c in model_service.feature_cols
            if c in df.columns
        ]
        if len(features_to_use) == 0:
            raise HTTPException(status_code=400, detail="INVALID DATASET: No trained features found in CSV")
            
        predicted_labels, probabilities = model_service.predict_tgn(df, features_to_use)
        
        # Track duplicate logs within this upload so we log clearly without spamming
        alerted_attack_types = set()
        alerts_sent = 0
        alert_threats = []

        for i, (_, row) in enumerate(df.iterrows()):
            raw_label = predicted_labels[i]
            # Convert raw label to category if necessary, or just use it
            clean_label = RAW_LABEL_TO_CATEGORY.get(raw_label, raw_label)
            confidence = float(np.max(probabilities[i]))
            risk_score, severity = model_service.calculate_risk(clean_label, confidence)
            
            src_ip_val = row.get('Src_IP_dec')
            if src_ip_val is None or pd.isna(src_ip_val):
                src_ip_val = row.get('Src IP', f"192.168.1.{i%255}")

            dst_ip_val = row.get('Dst_IP_dec')
            if dst_ip_val is None or pd.isna(dst_ip_val):
                dst_ip_val = row.get('Dst IP', f"10.0.0.{i%255}")

            src_port_val = row.get('Src_Port')
            if src_port_val is None or pd.isna(src_port_val):
                src_port_val = row.get('Src Port', 80)

            dst_port_val = row.get('Dst_Port')
            if dst_port_val is None or pd.isna(dst_port_val):
                dst_port_val = row.get('Dst Port', 443)

            # Store Network Flow
            flow = NetworkFlow(
                source_ip=str(src_ip_val),
                destination_ip=str(dst_ip_val),
                source_port=int(src_port_val),
                destination_port=int(dst_port_val),
                protocol=str(row.get('Protocol', 'TCP')),
                label=clean_label,
                features={} # Simplify for prototype speed
            )
            db.add(flow)
            db.flush() # To get flow.id
            
            # Store Prediction
            pred = Prediction(
                flow_id=flow.id,
                model_name="TGN",
                predicted_class=clean_label,
                confidence=confidence,
                risk_score=risk_score,
                prediction_type="tgn_forecast"
            )
            db.add(pred)
            db.flush()
            
            # Store Forecast (Simulated TGN)
            forecast = Forecast(
                prediction_id=pred.id,
                forecast_horizon="5 MIN",
                future_attack_type=clean_label if clean_label.lower() != "benign" else "DoS",
                probability=confidence * 0.8,
                risk_level=severity
            )
            db.add(forecast)
            
            # If Attack, store Security Event
            if clean_label.lower() != "benign":
                attacks_detected += 1
                if severity in ["HIGH", "CRITICAL"]:
                    high_risk_events += 1

                event = SecurityEvent(
                    source_ip=flow.source_ip,
                    destination_ip=flow.destination_ip,
                    attack_type=clean_label,
                    risk_score=risk_score,
                    severity=severity,
                    mitre_tactic=model_service.get_mitre_tactic(clean_label),
                    mitre_technique="T1498",
                    explanation=model_service.get_explanation(clean_label)
                )
                db.add(event)
                db.flush()  # get event.id before Caspian call

                # ── Caspian alert (isolated — never fails the upload) ─────────
                if _maybe_send_caspian_alert(event, db, alerted_attack_types):
                    alerts_sent += 1
                    if clean_label not in alert_threats:
                        alert_threats.append(clean_label)

            total_risk += risk_score

        db.commit()

        # Temporary development option: send exactly one test alert after successful upload if enabled
        send_upload_test = os.environ.get("SENTINELGRAPH_SEND_UPLOAD_TEST_ALERT", "false").strip().lower() in ("true", "1", "yes")
        if send_upload_test:
            logger.info("[CASPIAN DEBUG] SENTINELGRAPH_SEND_UPLOAD_TEST_ALERT enabled: sending upload test alert")
            try:
                test_sent, test_err = caspian_service.send_test_alert_with_result()
                logger.info("[CASPIAN DEBUG] Upload test alert result=%s (detail=%s)", "SUCCESS" if test_sent else "FAILED", test_err)
            except Exception as e:
                logger.error("[CASPIAN DEBUG] Upload test alert failed: %s", type(e).__name__)

        logger.info("[CASPIAN DEBUG] Upload completed")
        
        avg_risk = total_risk // len(df) if len(df) > 0 else 0
        alert_details = f"Threat detected ({', '.join(alert_threats)}) - Alert sent to Discord and Telegram" if alerts_sent > 0 else None
        
        return FlowUploadResponse(
            message="Traffic analysis complete",
            flows_processed=len(df),
            attacks_detected=attacks_detected,
            high_risk_events=high_risk_events,
            current_risk=avg_risk,
            alerts_sent=alerts_sent,
            alert_details=alert_details
        )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error during upload: {e}")
        raise HTTPException(status_code=500, detail="MODEL INFERENCE ERROR")

@app.get("/api/v1/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    total_flows = db.query(func.count(NetworkFlow.id)).scalar()
    
    if total_flows == 0:
        return DashboardSummary(
            total_flows=0, attacks_detected=0, high_risk_events=0, current_risk=0,
            attack_distribution={}, model_performance={}, forecast_projection={}
        )
        
    attacks_detected = db.query(func.count(SecurityEvent.id)).scalar()
    high_risk_events = db.query(func.count(SecurityEvent.id)).filter(SecurityEvent.severity.in_(["HIGH", "CRITICAL"])).scalar()
    
    # Calculate average risk of recent events
    recent_risk = db.query(func.avg(Prediction.risk_score)).scalar()
    current_risk = int(recent_risk) if recent_risk else 0
    
    # Attack distribution
    dist_query = db.query(SecurityEvent.attack_type, func.count(SecurityEvent.id)).group_by(SecurityEvent.attack_type).all()
    attack_distribution = {row[0]: row[1] for row in dist_query}
    # Ensure Benign is in distribution
    benign_count = total_flows - attacks_detected
    if benign_count > 0:
        attack_distribution["Benign"] = benign_count
        
    model_performance = {
        "Logistic Regression": "Baseline — 97.85%",
        "Random Forest": "Baseline — 99.65%",
        "TGN": "ACTIVE — Primary temporal model"
    }
    
    # Forecast projection simulated data based on current risk
    forecast_projection = {
        "next_1_min": min(current_risk + 5, 100),
        "next_3_min": min(current_risk + 12, 100),
        "next_5_min": min(current_risk + 18, 100)
    }
    
    return DashboardSummary(
        total_flows=total_flows,
        attacks_detected=attacks_detected,
        high_risk_events=high_risk_events,
        current_risk=current_risk,
        attack_distribution=attack_distribution,
        model_performance=model_performance,
        forecast_projection=forecast_projection
    )

@app.get("/api/v1/security-events")
def get_security_events(limit: int = 5, db: Session = Depends(get_db)):
    events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
    return events

@app.get("/api/v1/predictions")
def get_recent_predictions(limit: int = 10, db: Session = Depends(get_db)):
    # Join prediction with network flow
    preds = db.query(Prediction, NetworkFlow).join(NetworkFlow).order_by(Prediction.prediction_timestamp.desc()).limit(limit).all()
    
    result = []
    for pred, flow in preds:
        result.append({
            "time": pred.prediction_timestamp.strftime("%H:%M:%S"),
            "source": flow.source_ip,
            "destination": flow.destination_ip,
            "model": pred.model_name,
            "attack": pred.predicted_class,
            "confidence": f"{pred.confidence * 100:.1f}%",
            "risk": pred.risk_score,
            "severity": pred.risk_score >= 85 and "CRITICAL" or pred.risk_score >= 60 and "HIGH" or pred.risk_score >= 30 and "MEDIUM" or "LOW"
        })
    return result

@app.get("/api/v1/forecast")
def get_forecast(db: Session = Depends(get_db)):
    forecasts = db.query(Forecast).order_by(Forecast.created_at.desc()).limit(10).all()
    return forecasts


# ── Caspian test endpoint ─────────────────────────────────────────────────────
@app.post("/api/v1/caspian/test")
def caspian_test():
    """
    Send a clearly labelled test message through the Caspian integration.
    Does NOT create a database security event.
    Only active when Caspian status is READY.
    """
    status = caspian_service.get_status()
    dest_configured = (status == "READY")
    logger.info("[CASPIAN DEBUG] Test alert requested")
    logger.info("[CASPIAN DEBUG] Destination configured=%s", dest_configured)

    if not dest_configured:
        return {
            "sent": False,
            "caspian_status": status,
            "detail": f"Caspian is {status} — configure credentials first.",
        }
    sent, err_msg = caspian_service.send_test_alert_with_result()
    return {
        "sent": sent,
        "caspian_status": status,
        "detail": "Test alert sent" if sent else f"Send failed: {err_msg}",
    }


# ── Internal helper — Caspian duplicate prevention ───────────────────────────
def _maybe_send_caspian_alert(event: SecurityEvent, db: Session, alerted_attack_types: set = None) -> bool:
    """
    Evaluates whether a SecurityEvent should trigger a Caspian alert.
    Conditions:
        1. event.risk_score >= SENTINELGRAPH_RISK_THRESHOLD (default 60).
        2. Destination must be configured (Caspian in READY state).
        3. No other SENT notification for the same attack_type
           within SENTINELGRAPH_ALERT_INTERVAL minutes (if interval_minutes > 0).
           If interval_minutes <= 0, duplicate check across uploads is skipped.
        4. alerted_attack_types tracks attacks already alerted in this current upload batch.

    Always records a Notification row (SENT or FAILED).
    Never raises — all exceptions are caught so the upload pipeline is safe.
    Returns:
        bool: True if alert was successfully sent, False otherwise.
    """
    try:
        threshold = int(os.environ.get("SENTINELGRAPH_RISK_THRESHOLD", "60"))
        interval_minutes = int(os.environ.get("SENTINELGRAPH_ALERT_INTERVAL", "0"))

        if alerted_attack_types is None:
            alerted_attack_types = set()

        # If already alerted in this upload batch, suppress duplicate processing quietly
        if event.attack_type in alerted_attack_types:
            return False

        logger.info("[CASPIAN DEBUG] Non-benign event found")
        logger.info("[CASPIAN DEBUG] attack_type=%s", event.attack_type)
        logger.info("[CASPIAN DEBUG] risk_score=%s", int(event.risk_score))
        logger.info("[CASPIAN DEBUG] threshold=%d", threshold)

        eligible = (event.risk_score >= threshold)
        logger.info("[CASPIAN DEBUG] eligible=%s", eligible)
        if not eligible:
            return False

        dest_configured = (caspian_service.get_status() == "READY")
        if not dest_configured:
            logger.info(
                "[CASPIAN DEBUG] Alert skipped: destination not configured or status=%s",
                caspian_service.get_status()
            )
            return False

        # ── Duplicate window check ─────────────────────────────────────────
        if interval_minutes > 0:
            now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
            window_start = now_naive - timedelta(minutes=interval_minutes)
            duplicate = (
                db.query(Notification)
                .join(SecurityEvent, Notification.security_event_id == SecurityEvent.id)
                .filter(
                    Notification.channel == "caspian",
                    Notification.status == "SENT",
                    SecurityEvent.attack_type == event.attack_type,
                    Notification.sent_at >= window_start,
                )
                .first()
            )
            is_duplicate = (duplicate is not None)
            logger.info("[CASPIAN DEBUG] duplicate_suppressed=%s", is_duplicate)
            if is_duplicate:
                alerted_attack_types.add(event.attack_type)
                return False
        else:
            logger.info("[CASPIAN DEBUG] duplicate window check skipped (interval_minutes=%d)", interval_minutes)

        # ── Send alert ────────────────────────────────────────────────────
        logger.info("[CASPIAN DEBUG] calling send_alert()")
        sent, err_msg = caspian_service.send_security_alert_with_result(event)
        logger.info("[CASPIAN DEBUG] send result=%s", "SUCCESS" if sent else "FAILED")

        # ── Record notification ──────────────────────────────────────────
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        conv_id = os.environ.get("CASPIAN_ALERT_CONVERSATION_ID", "")
        masked_conv = conv_id[:4] + "..." + conv_id[-4:] if len(conv_id) > 8 else "***"
        notif = Notification(
            security_event_id=event.id,
            channel="caspian",
            recipient=masked_conv,
            message=f"Security alert: {event.attack_type} risk={int(event.risk_score)}",
            status="SENT" if sent else "FAILED",
            sent_at=now_naive if sent else None,
            error_message=None if sent else (err_msg or "Caspian HttpGatewayClient returned an error"),
        )
        db.add(notif)
        db.flush()  # Make visible to subsequent events in the same upload transaction
        logger.info("[CASPIAN DEBUG] notification status=%s", notif.status)

        if sent:
            alerted_attack_types.add(event.attack_type)
            return True
        return False

    except Exception as exc:
        # Caspian failure must never propagate to the upload response
        logger.error("Caspian alert helper raised unexpectedly: %s", type(exc).__name__)
        return False


# Serve Frontend static files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
