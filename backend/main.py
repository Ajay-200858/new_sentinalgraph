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
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db, engine
from backend.models import Base, NetworkFlow, Prediction, Forecast, SecurityEvent, Notification, User, IsolatedHost
from backend.schemas import SystemStatus, FlowUploadResponse, DashboardSummary
from backend.model_service import model_service
from backend import caspian_service
from backend.replay_service import replay_manager, standardize_dataframe_columns
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
    
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)

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
        df = standardize_dataframe_columns(df)
        
        # Save a copy into data/uploads so user can also select it in Replay Simulation
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        uploads_dir = os.path.join(base_dir, "data", "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        safe_filename = os.path.basename(file.filename)
        saved_file_path = os.path.join(uploads_dir, safe_filename)
        try:
            with open(saved_file_path, "wb") as f_out:
                f_out.write(content)
        except Exception as e_save:
            logger.warning(f"Could not save upload to data/uploads: {e_save}")

        # Verify required columns (or at least that it has features)
        missing_essentials = []
        has_ts = any(c in df.columns for c in ["Timestamp", "time", "date", "flow_timestamp"])
        has_src = any(c in df.columns for c in ["Src IP", "Src_IP_dec", "source_ip", "src_ip", "Src Port", "Src_Port"])
        has_dst = any(c in df.columns for c in ["Dst IP", "Dst_IP_dec", "destination_ip", "dst_ip", "Dst Port", "Dst_Port"])
        
        if not has_ts:
            missing_essentials.append("Timestamp")
        if not has_src:
            missing_essentials.append("Source IP / Port")
        if not has_dst:
            missing_essentials.append("Destination IP / Port")

        if missing_essentials:
            raise HTTPException(
                status_code=400,
                detail=f"INVALID DATASET: Missing required network telemetry columns: {', '.join(missing_essentials)}"
            )
            
        # Clean data
        df = df.dropna()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        inf_mask = np.isinf(df[numeric_cols].values).any(axis=1)
        df = df[~inf_mask]
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="INVALID DATASET: No valid numeric rows found after cleaning")

        # Process up to 2500 rows to ensure qualifying attack samples are captured while keeping response fast
        if len(df) > 2500:
            df = df.head(2500)

        df = df.reset_index(drop=True)
            
        attacks_detected = 0
        high_risk_events = 0
        total_risk = 0
        
        if not model_service.is_loaded:
            model_service.load_models()
            
        features_to_use = [
            c for c in model_service.feature_cols
            if c in df.columns
        ]
        if len(features_to_use) == 0:
            missing_preview = model_service.feature_cols[:8]
            raise HTTPException(
                status_code=400,
                detail=f"INVALID DATASET: No recognized network flow features found. Expected feature columns such as: {', '.join(missing_preview)}"
            )
            
        predicted_labels, probabilities = model_service.predict_tgn(df, features_to_use)
        
        # Track duplicate logs within this upload so we log clearly without spamming
        alerted_attack_types = set()
        alerts_sent = 0
        alert_threats = []

        from backend.flow_processor import process_flow_row

        for i, (_, row) in enumerate(df.iterrows()):
            row_dict = row.to_dict()
            row_dict['predicted_label'] = predicted_labels[i]
            row_dict['confidence'] = float(np.max(probabilities[i]))
            
            res = process_flow_row(row_dict, db, alerted_attack_types, i)
            
            if res["attack_detected"]:
                attacks_detected += 1
            if res["high_risk"]:
                high_risk_events += 1
            if res["alert_sent"]:
                alerts_sent += 1
                if res["clean_label"] not in alert_threats:
                    alert_threats.append(res["clean_label"])
            
            total_risk += res["risk_score"]

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
            message="Traffic analysis complete. Uploaded file is also available for simulation in Replay Engine.",
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
        logger.error(f"Error during upload: {e}")
        raise HTTPException(status_code=500, detail=f"MODEL INFERENCE ERROR: {str(e)}")


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
    
    total_predictions = db.query(func.count(Prediction.id)).scalar() or 0
    active_hosts = db.query(func.count(func.distinct(NetworkFlow.source_ip))).scalar() or 0

    return DashboardSummary(
        total_flows=total_flows,
        attacks_detected=attacks_detected,
        high_risk_events=high_risk_events,
        current_risk=current_risk,
        attack_distribution=attack_distribution,
        model_performance=model_performance,
        forecast_projection=forecast_projection,
        total_predictions=total_predictions,
        active_hosts=active_hosts
    )

@app.get("/api/v1/security-events")
def get_security_events(limit: int = 100, db: Session = Depends(get_db)):
    events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
    result = []
    for e in events:
        result.append({
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "source_ip": _decimal_to_ip(e.source_ip),
            "destination_ip": _decimal_to_ip(e.destination_ip),
            "attack_type": e.attack_type,
            "risk_score": e.risk_score,
            "severity": e.severity,
            "mitre_tactic": e.mitre_tactic,
            "mitre_technique": e.mitre_technique,
            "status": e.status,
            "created_at": e.created_at.isoformat() if e.created_at else None
        })
    return result

@app.get("/api/v1/predictions")
def get_recent_predictions(limit: int = 20, db: Session = Depends(get_db)):
    # Join prediction with network flow
    preds = db.query(Prediction, NetworkFlow).join(NetworkFlow).order_by(Prediction.prediction_timestamp.desc()).limit(limit).all()
    
    result = []
    for pred, flow in preds:
        result.append({
            "time": pred.prediction_timestamp.strftime("%H:%M:%S") if pred.prediction_timestamp else "-",
            "source": _decimal_to_ip(flow.source_ip),
            "destination": _decimal_to_ip(flow.destination_ip),
            "model": pred.model_name,
            "attack": pred.predicted_class,
            "confidence": f"{pred.confidence * 100:.1f}%",
            "risk": int(pred.risk_score),
            "severity": "CRITICAL" if pred.risk_score >= 85 else "HIGH" if pred.risk_score >= 60 else "MEDIUM" if pred.risk_score >= 30 else "LOW"
        })
    return result

@app.get("/api/v1/forecast")
def get_forecast(db: Session = Depends(get_db)):
    forecasts = db.query(Forecast, Prediction, NetworkFlow)\
        .join(Prediction, Forecast.prediction_id == Prediction.id)\
        .join(NetworkFlow, Prediction.flow_id == NetworkFlow.id)\
        .order_by(Forecast.created_at.desc())\
        .limit(20)\
        .all()
        
    if not forecasts:
        return {
            "currentThreat": None,
            "escalations": [],
            "recommendation": None,
            "history": []
        }
        
    latest_f, latest_p, latest_nf = forecasts[0]
    primary_host_ip = _decimal_to_ip(latest_nf.destination_ip)
    
    current_threat = {
        "threatName": latest_f.future_attack_type,
        "forecastHorizon": latest_f.forecast_horizon or "5 MIN",
        "probability": int(latest_f.probability * 100),
        "confidence": f"{latest_p.confidence * 100:.1f}%",
        "riskLevel": latest_f.risk_level or "HIGH",
        "explanation": model_service.get_explanation(latest_f.future_attack_type),
        "reason": f"Observed temporal pattern indicative of escalating {latest_f.future_attack_type}",
        "affectedHostCount": 1,
        "affectedHost": primary_host_ip,
        "primaryHost": primary_host_ip,
        "timestamp": latest_f.created_at.isoformat() if latest_f.created_at else None,
        "detectedTime": latest_f.created_at.strftime("%H:%M:%S") if latest_f.created_at else "Recent"
    }
    
    escalations = []
    history = []
    for idx, (f, p, nf) in enumerate(forecasts):
        host_ip = _decimal_to_ip(nf.destination_ip)
        ts_str = f.created_at.isoformat() if f.created_at else None
        
        history.append({
            "id": f.id,
            "predictedAttack": f.future_attack_type,
            "horizon": f.forecast_horizon or "5 MIN",
            "probability": int(f.probability * 100),
            "confidence": f"{p.confidence * 100:.1f}%",
            "affectedHost": host_ip,
            "riskLevel": f.risk_level or "HIGH",
            "timestamp": ts_str,
            "timeFormatted": f.created_at.strftime("%H:%M:%S") if f.created_at else "-"
        })

        if idx < 5:
            escalations.append({
                "id": f"ESC-{f.id}",
                "threatName": f.future_attack_type,
                "probability": int(f.probability * 100),
                "timeline": f.forecast_horizon or "5 MIN",
                "mitreTactic": model_service.get_mitre_tactic(f.future_attack_type),
                "mitreId": "T1498",
                "affectedHosts": [host_ip],
                "severity": f.risk_level or "HIGH",
                "recommendedAction": f"Investigate host {host_ip} and isolate if malicious"
            })
        
    recommendation = {
        "action": f"Logically Isolate Host {primary_host_ip}",
        "reason": f"High probability of {latest_f.future_attack_type} escalation within {latest_f.forecast_horizon or '5 MIN'}",
        "relatedThreat": latest_f.future_attack_type,
        "riskLevel": latest_f.risk_level or "HIGH",
        "affectedHost": primary_host_ip,
        "hostIp": primary_host_ip,
        "confidenceScore": int(latest_p.confidence * 100)
    }
    
    return {
        "currentThreat": current_threat,
        "escalations": escalations,
        "recommendation": recommendation,
        "history": history
    }

def _decimal_to_ip(val):
    """Convert decimal IP representation to dotted-decimal string."""
    if val is None:
        return "0.0.0.0"
    try:
        # If it's already an IP string (contains dots), return as-is
        s = str(val)
        if '.' in s:
            return s
        # Try converting numeric decimal to IP
        n = int(float(s))
        return f"{(n >> 24) & 255}.{(n >> 16) & 255}.{(n >> 8) & 255}.{n & 255}"
    except (ValueError, TypeError):
        return str(val)

@app.get("/api/v1/hosts")
def get_hosts(db: Session = Depends(get_db)):
    # 1. Fetch isolated hosts from PostgreSQL
    isolated_rows = db.query(IsolatedHost).filter(IsolatedHost.status == "ISOLATED").all()
    isolated_ips = set(h.ip_address for h in isolated_rows)

    hosts = {}

    # 2. Get security events to find attacks, highest severity and max risk per host
    events = db.query(
        SecurityEvent.source_ip,
        SecurityEvent.attack_type,
        SecurityEvent.risk_score,
        SecurityEvent.severity,
        SecurityEvent.timestamp
    ).order_by(SecurityEvent.timestamp.desc()).limit(1000).all()

    for src, att, risk, sev, ts in events:
        ip = _decimal_to_ip(src)
        if ip not in hosts:
            hosts[ip] = {
                "id": ip,
                "ip": ip,
                "internal": ip.startswith(("10.", "192.168.", "172.")),
                "flow_count": 0,
                "attack_count": 0,
                "max_risk": 0.0,
                "severity": "LOW",
                "last_seen": ts.isoformat() if ts else None,
                "status": "Isolated" if ip in isolated_ips else "Active",
                "is_isolated": ip in isolated_ips
            }
        hosts[ip]["attack_count"] += 1
        hosts[ip]["max_risk"] = max(hosts[ip]["max_risk"], float(risk or 0))
        if sev in ["CRITICAL", "HIGH"] or hosts[ip]["max_risk"] >= 60:
            hosts[ip]["severity"] = sev or "HIGH"

    # 3. Pull recent network flows (limit to 500 to keep it lightning fast on large databases)
    recent_flows = db.query(
        NetworkFlow.source_ip,
        NetworkFlow.destination_ip,
        NetworkFlow.label,
        NetworkFlow.timestamp
    ).order_by(NetworkFlow.timestamp.desc()).limit(500).all()

    for src, dst, label, ts in recent_flows:
        for raw_ip in (src, dst):
            ip = _decimal_to_ip(raw_ip)
            if ip not in hosts:
                hosts[ip] = {
                    "id": ip,
                    "ip": ip,
                    "internal": ip.startswith(("10.", "192.168.", "172.")),
                    "flow_count": 0,
                    "attack_count": 0,
                    "max_risk": 0.0,
                    "severity": "BENIGN",
                    "last_seen": ts.isoformat() if ts else None,
                    "status": "Isolated" if ip in isolated_ips else "Active",
                    "is_isolated": ip in isolated_ips
                }
            hosts[ip]["flow_count"] += 1
            if not hosts[ip]["last_seen"] and ts:
                hosts[ip]["last_seen"] = ts.isoformat()

    # Also make sure any explicitly isolated hosts appear in the list
    for iso in isolated_rows:
        ip = iso.ip_address
        if ip not in hosts:
            hosts[ip] = {
                "id": ip,
                "ip": ip,
                "internal": ip.startswith(("10.", "192.168.", "172.")),
                "flow_count": 0,
                "attack_count": 0,
                "max_risk": 0.0,
                "severity": "ISOLATED",
                "last_seen": iso.isolated_at.isoformat() if iso.isolated_at else None,
                "status": "Isolated",
                "is_isolated": True
            }

    sorted_hosts = sorted(
        hosts.values(),
        key=lambda x: (x["is_isolated"], x["attack_count"], x["max_risk"], x["flow_count"]),
        reverse=True
    )[:100]
    return sorted_hosts

@app.get("/api/v1/mitre")
def get_mitre(db: Session = Depends(get_db)):
    # Query distinct attack types and MITRE tactics/techniques from actual security events
    attacks = db.query(
        SecurityEvent.attack_type,
        SecurityEvent.mitre_tactic,
        SecurityEvent.mitre_technique,
        func.count(SecurityEvent.id)
    ).filter(
        func.lower(SecurityEvent.attack_type) != "benign"
    ).group_by(
        SecurityEvent.attack_type,
        SecurityEvent.mitre_tactic,
        SecurityEvent.mitre_technique
    ).order_by(func.count(SecurityEvent.id).desc()).all()

    results = []
    for att, tac, tech, count in attacks:
        resolved_tactic = tac or model_service.get_mitre_tactic(att)
        resolved_tech = tech if tech and tech != "Unknown" else model_service.get_mitre_technique(att)
        if not resolved_tech or resolved_tech.strip() == "":
            resolved_tech = "Technique not mapped"
        results.append({
            "attack_type": att,
            "tactic": resolved_tactic,
            "technique": resolved_tech,
            "description": f"Detected {count} events mapped to {att}",
            "count": count
        })
    return results

@app.get("/api/v1/notifications")
def get_notifications(limit: int = 50, db: Session = Depends(get_db)):
    notifs = db.query(Notification, SecurityEvent).outerjoin(
        SecurityEvent, Notification.security_event_id == SecurityEvent.id
    ).order_by(Notification.created_at.desc()).limit(limit).all()
    results = []
    for notif, evt in notifs:
        ts = notif.created_at or notif.sent_at
        results.append({
            "id": notif.id,
            "timestamp": ts.isoformat() if ts else None,
            "channel": notif.channel,
            "status": notif.status,
            "error_message": notif.error_message,
            "attack_type": evt.attack_type if evt else "Unknown",
            "risk_score": evt.risk_score if evt else 0,
            "source_ip": _decimal_to_ip(evt.source_ip) if evt else None,
            "destination_ip": _decimal_to_ip(evt.destination_ip) if evt else None,
        })
    return results

@app.get("/api/v1/system-status")
def get_system_status(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "Connected"
    except Exception:
        db_status = "Error"

    return {
        "backend": "Connected",
        "database": db_status,
        "model": "Ready" if model_service.is_loaded else "Not Loaded",
        "replay": replay_manager.get_status()["state"],
        "caspian": caspian_service.get_status(),
        "last_checked": datetime.now(timezone.utc).isoformat()
    }


# ── LIVE DASHBOARD & REPLAY ENDPOINTS ───────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    # Simplified login against fixed credentials or User table if needed
    if req.username == "admin" and req.password == "password":
        return {"token": "demo_token", "user": req.username}
    raise HTTPException(status_code=401, detail="Invalid credentials")

class RegisterRequest(BaseModel):
    username: str
    password: str

@app.post("/api/v1/auth/register")
def register(req: RegisterRequest):
    return {"status": "success", "message": "User registered (dev mode)"}

@app.post("/api/v1/auth/logout")
def logout():
    return {"status": "success"}

@app.get("/api/graph")
@app.get("/api/dashboard/graph")
def graph(limit: int = 50, db: Session = Depends(get_db)):
    # 1. Fetch isolated hosts
    isolated_rows = db.query(IsolatedHost).filter(IsolatedHost.status == "ISOLATED").all()
    isolated_ips = set(h.ip_address for h in isolated_rows)

    # 2. Build graph from recent flows
    flows = db.query(NetworkFlow).order_by(NetworkFlow.timestamp.desc()).limit(200).all()
    
    nodes_dict = {}
    edges_dict = {}
    
    for flow in flows:
        src_ip = _decimal_to_ip(flow.source_ip)
        dst_ip = _decimal_to_ip(flow.destination_ip)
        
        # Source node
        if src_ip not in nodes_dict:
            nodes_dict[src_ip] = {
                "id": src_ip,
                "ip": src_ip,
                "threat_type": None,
                "confidence": 0.0,
                "flow_count": 0,
                "attack_count": 0,
                "risk_score": 0.0,
                "risk_level": "Benign",
                "last_seen": flow.timestamp.isoformat() if flow.timestamp else None,
                "status": "Isolated" if src_ip in isolated_ips else "Active",
                "is_isolated": src_ip in isolated_ips,
                "type": "Internal" if src_ip.startswith(("10.", "192.168.", "172.")) else "External"
            }
        # Dest node
        if dst_ip not in nodes_dict:
            nodes_dict[dst_ip] = {
                "id": dst_ip,
                "ip": dst_ip,
                "threat_type": None,
                "confidence": 0.0,
                "flow_count": 0,
                "attack_count": 0,
                "risk_score": 0.0,
                "risk_level": "Benign",
                "last_seen": flow.timestamp.isoformat() if flow.timestamp else None,
                "status": "Isolated" if dst_ip in isolated_ips else "Active",
                "is_isolated": dst_ip in isolated_ips,
                "type": "Internal" if dst_ip.startswith(("10.", "192.168.", "172.")) else "External"
            }
        
        nodes_dict[src_ip]["flow_count"] += 1
        nodes_dict[dst_ip]["flow_count"] += 1
        if flow.timestamp:
            nodes_dict[src_ip]["last_seen"] = flow.timestamp.isoformat()
            nodes_dict[dst_ip]["last_seen"] = flow.timestamp.isoformat()
            
        edge_key = (src_ip, dst_ip)
        if edge_key not in edges_dict:
            edges_dict[edge_key] = {
                "source": src_ip,
                "target": dst_ip,
                "protocol": flow.protocol or "TCP",
                "port": flow.destination_port or 443,
                "attack_type": None,
                "flow_count": 0,
                "attack_count": 0,
                "timestamp": flow.timestamp.isoformat() if flow.timestamp else None
            }
        edges_dict[edge_key]["flow_count"] += 1
            
        if flow.label and flow.label.lower() != "benign":
            nodes_dict[src_ip]["threat_type"] = flow.label
            nodes_dict[src_ip]["attack_count"] += 1
            nodes_dict[src_ip]["confidence"] = 0.9
            nodes_dict[src_ip]["risk_score"] = max(nodes_dict[src_ip]["risk_score"], 75.0)
            edges_dict[edge_key]["attack_type"] = flow.label
            edges_dict[edge_key]["attack_count"] += 1

    # Update node risk levels
    for ip, n in nodes_dict.items():
        if n["is_isolated"]:
            n["risk_level"] = "Isolated"
            n["status"] = "Isolated"
        elif n["risk_score"] >= 85:
            n["risk_level"] = "Critical"
            n["status"] = "Critical"
        elif n["risk_score"] >= 60 or n["attack_count"] > 0:
            n["risk_level"] = "High"
            n["status"] = "High Risk"
        elif n["risk_score"] >= 30:
            n["risk_level"] = "Suspicious"
            n["status"] = "Suspicious"
        else:
            n["risk_level"] = "Benign"
            n["status"] = "Active"

    nodes_limit = min(max(10, limit), len(nodes_dict))
    # Sort prioritizing attack-involved, isolated, and highly connected nodes
    sorted_nodes = sorted(
        nodes_dict.values(),
        key=lambda n: (n.get("is_isolated", False), n.get("attack_count", 0), n.get("flow_count", 0)),
        reverse=True
    )[:nodes_limit]
    
    top_node_ids = set(n["id"] for n in sorted_nodes)
    
    filtered_edges = []
    for (src, dst), edge in edges_dict.items():
        if src in top_node_ids and dst in top_node_ids:
            filtered_edges.append(edge)

    return {
        "nodes": sorted_nodes,
        "edges": filtered_edges
    }

@app.get("/api/v1/replay/datasets")
def list_replay_datasets():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    uploads_dir = os.path.join(data_dir, "uploads")
    
    datasets = []
    if os.path.exists(data_dir):
        for f in os.listdir(data_dir):
            if f.endswith(".csv") and os.path.isfile(os.path.join(data_dir, f)):
                datasets.append({"name": f, "source": "data"})
                
    if os.path.exists(uploads_dir):
        for f in os.listdir(uploads_dir):
            if f.endswith(".csv") and os.path.isfile(os.path.join(uploads_dir, f)):
                datasets.append({"name": f"uploads/{f}", "source": "uploads"})
                
    return datasets

class ReplayRequest(BaseModel):
    dataset: str
    speed: float = 10.0

@app.post("/api/replay")
@app.post("/api/v1/replay/start")
@app.post("/api/simulation/start")
def replay_start(req: ReplayRequest):
    success, msg = replay_manager.start(req.dataset, req.speed)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "replay started", "dataset": req.dataset, "speed": req.speed}

@app.post("/api/v1/replay/stop")
@app.post("/api/simulation/stop")
def replay_stop():
    success, msg = replay_manager.stop()
    return {"status": msg}

@app.get("/api/replay/status")
@app.get("/api/v1/replay/status")
@app.get("/api/simulation/status")
def replay_status():
    return replay_manager.get_status()

class IsolateRequest(BaseModel):
    ip: str

@app.post("/api/v1/hosts/{host_id}/isolate")
def isolate_host_v1(host_id: str, db: Session = Depends(get_db)):
    ip = _decimal_to_ip(host_id)
    host = db.query(IsolatedHost).filter(IsolatedHost.ip_address == ip).first()
    if not host:
        host = IsolatedHost(ip_address=ip, status="ISOLATED", reason="Manual logical isolation from SOC Dashboard")
        db.add(host)
    else:
        host.status = "ISOLATED"
        host.reason = "Manual logical isolation from SOC Dashboard"
        host.isolated_at = datetime.utcnow()
    db.commit()
    return {
        "status": "success",
        "action": "isolate",
        "host_id": ip,
        "is_isolated": True,
        "message": f"Prototype logical isolation: Host {ip} logically isolated in PostgreSQL.",
        "label": "Prototype logical isolation"
    }

@app.post("/api/v1/hosts/{host_id}/restore")
def restore_host_v1(host_id: str, db: Session = Depends(get_db)):
    ip = _decimal_to_ip(host_id)
    host = db.query(IsolatedHost).filter(IsolatedHost.ip_address == ip).first()
    if host:
        host.status = "RESTORED"
        db.commit()
    return {
        "status": "success",
        "action": "restore",
        "host_id": ip,
        "is_isolated": False,
        "message": f"Host {ip} restored to active status.",
        "label": "Prototype logical isolation"
    }

@app.post("/api/isolate-host")
def isolate_host(req: IsolateRequest, db: Session = Depends(get_db)):
    return isolate_host_v1(req.ip, db)

# ── Caspian endpoints ─────────────────────────────────────────────────────────
@app.get("/api/v1/caspian/status")
def get_caspian_status(db: Session = Depends(get_db)):
    info = caspian_service.get_channel_status()
    total_notifications = db.query(func.count(Notification.id)).scalar() or 0
    sent_count = db.query(func.count(Notification.id)).filter(Notification.status == "SENT").scalar() or 0
    failed_count = db.query(func.count(Notification.id)).filter(Notification.status == "FAILED").scalar() or 0
    
    last_failed = db.query(Notification).filter(Notification.status == "FAILED").order_by(Notification.created_at.desc()).first()
    last_error = last_failed.error_message if last_failed else None

    return {
        **info,
        "total_notifications": total_notifications,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "last_error": last_error,
    }

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


# Serve Frontend static files (built React app from dist or frontend source)
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
dist_dir = os.path.join(frontend_dir, "dist")
frontend_path = dist_dir if os.path.isdir(dist_dir) else frontend_dir
os.makedirs(frontend_path, exist_ok=True)

@app.exception_handler(404)
async def spa_fallback(request, exc):
    if not request.url.path.startswith("/api") and not request.url.path.startswith("/health"):
        index_file = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    raise exc

app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
