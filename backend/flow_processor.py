import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from backend.models import NetworkFlow, Prediction, Forecast, SecurityEvent
from backend.model_service import model_service
from config import RAW_LABEL_TO_CATEGORY

def process_flow_row(row, db: Session, alerted_attack_types: set, i: int = 0):
    from backend.main import _maybe_send_caspian_alert
    
    raw_label = row.get('predicted_label', 'BENIGN')
    confidence = row.get('confidence', 0.0)
    
    clean_label = RAW_LABEL_TO_CATEGORY.get(raw_label, raw_label)
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
    
    # Store Forecast
    forecast = Forecast(
        prediction_id=pred.id,
        forecast_horizon="5 MIN",
        future_attack_type=clean_label if clean_label.lower() != "benign" else "DoS",
        probability=confidence * 0.8,
        risk_level=severity
    )
    db.add(forecast)
    
    attack_detected = False
    high_risk = False
    alert_sent = False
    
    # If Attack, store Security Event
    if clean_label.lower() != "benign":
        attack_detected = True
        if severity in ["HIGH", "CRITICAL"]:
            high_risk = True

        event = SecurityEvent(
            source_ip=flow.source_ip,
            destination_ip=flow.destination_ip,
            attack_type=clean_label,
            risk_score=risk_score,
            severity=severity,
            mitre_tactic=model_service.get_mitre_tactic(clean_label),
            mitre_technique=model_service.get_mitre_technique(clean_label),
            explanation=model_service.get_explanation(clean_label)
        )
        db.add(event)
        db.flush()  # get event.id before Caspian call

        # Caspian alert
        if _maybe_send_caspian_alert(event, db, alerted_attack_types):
            alert_sent = True

    return {
        "risk_score": risk_score,
        "attack_detected": attack_detected,
        "high_risk": high_risk,
        "alert_sent": alert_sent,
        "clean_label": clean_label
    }
