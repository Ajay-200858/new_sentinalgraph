import time
import json
import random
from collections import defaultdict, deque
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
windows_log_path = backend_dir / "windows_log.jsonl"
forecasts_log_path = backend_dir / "forecasts_log.jsonl"

def get_current_risk(client_ip):
    # Placeholder: returns a random 0-1 float for now.
    # Tomorrow, wire this to the real TGN/RF output.
    return random.random()

def check_anomaly(window):
    # Simple threshold checks for anomalies
    if window["request_count"] > 10: return True
    if window["failed_request_pct"] > 0.1: return True
    if window["new_endpoint_flag"]: return True
    return False

def evaluate_forecast(ip, history_q):
    if len(history_q) < 4:
        return None
        
    windows = list(history_q)
    reasons = []
    
    # 1. persistence_score
    anomalies = sum(1 for w in windows if check_anomaly(w))
    persistence_score = anomalies / 4.0
    if persistence_score > 0.5:
        reasons.append("High persistence of anomalous behaviour")
        
    # 2. escalation_score
    req_slope = windows[-1]["request_count"] - windows[0]["request_count"]
    fail_slope = windows[-1]["failed_request_pct"] - windows[0]["failed_request_pct"]
    
    escalation_score = 0.0
    if req_slope > 0 or fail_slope > 0:
        escalation_score = 1.0
        reasons.append("Escalating request volume or error rate")
    elif req_slope == 0 and fail_slope == 0:
        escalation_score = 0.5
        
    # 3. shape_match_score
    shape_match_score = 0.0
    if (windows[0]["new_endpoint_flag"] or windows[1]["new_endpoint_flag"]) and \
       (windows[2]["request_count"] > windows[1]["request_count"]) and \
       (windows[3]["failed_request_pct"] > 0):
        shape_match_score = 1.0
        reasons.append("Matches known precursor shape")
        
    # 4. forecastability
    forecastability = (persistence_score * 0.4) + (escalation_score * 0.3) + (shape_match_score * 0.3)
    
    # 5. threat_risk
    threat_risk = get_current_risk(ip)
    
    return {
        "timestamp": time.time(),
        "client_ip": ip,
        "threat_risk": round(threat_risk, 3),
        "forecastability": round(forecastability, 3),
        "forecast_window_seconds": 45,
        "reason": reasons
    }

def main():
    print("Starting forecast engine. Monitoring windows...")
    
    ip_history = defaultdict(lambda: deque(maxlen=4))
    last_position = 0
    
    if windows_log_path.exists():
        last_position = windows_log_path.stat().st_size
        
    while True:
        time.sleep(2)
        
        if not windows_log_path.exists():
            continue
            
        new_records = []
        with open(windows_log_path, "r") as f:
            f.seek(last_position)
            for line in f:
                if line.strip():
                    try:
                        record = json.loads(line)
                        new_records.append(record)
                    except json.JSONDecodeError:
                        pass
            last_position = f.tell()
            
        for record in new_records:
            ip = record["client_ip"]
            ip_history[ip].append(record)
            
            result = evaluate_forecast(ip, ip_history[ip])
            if result:
                if result["forecastability"] > 0.6 and result["threat_risk"] > 0.5:
                    print(f"\n[!] FORECAST EMITTED for {ip}")
                    print(f"    Risk: {result['threat_risk']} | Forecastability: {result['forecastability']}")
                    print(f"    Reasons: {', '.join(result['reason'])}")
                    
                    with open(forecasts_log_path, "a") as out_f:
                        out_f.write(json.dumps(result) + "\n")
                elif result["threat_risk"] > 0.5 and result["forecastability"] <= 0.6:
                    print(f"[-] Anomalous but not yet forecastable — monitoring {ip}")

if __name__ == "__main__":
    main()
