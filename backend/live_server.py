import time
import json
import os
from pathlib import Path
from fastapi import Request
from backend.main import app

# Ensure backend directory exists for logs
backend_dir = Path(__file__).resolve().parent
requests_log_path = backend_dir / "requests_log.jsonl"

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000
    
    # Extract client IP
    client_ip = request.client.host if request.client else "unknown"
    # Fallback to headers if behind proxy
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0]
        
    log_entry = {
        "timestamp": time.time(),
        "client_ip": client_ip,
        "endpoint": request.url.path,
        "method": request.method,
        "status_code": response.status_code,
        "response_time_ms": round(process_time_ms, 2)
    }
    
    with open(requests_log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
        
    return response

# Note: /health is already defined in backend.main, we'll keep the existing one.
# The user wants GET /, GET /login, GET /data, GET /dashboard, GET /admin.
# /login might exist as POST /api/login but we will add GET /login as requested.

@app.get("/")
def read_root():
    return {"message": "SentinelGraph Live Traffic Root"}

@app.get("/login")
def get_login_page():
    return {"message": "Login Page Placeholder"}

@app.get("/data")
def get_data_page():
    return {"message": "Data Page Placeholder"}

@app.get("/dashboard")
def get_dashboard_page():
    return {"message": "Dashboard Page Placeholder"}

@app.get("/admin")
def get_admin_page():
    return {"message": "Admin Page Placeholder"}

# --- Part 5 Endpoints ---

windows_log_path = backend_dir / "windows_log.jsonl"
forecasts_log_path = backend_dir / "forecasts_log.jsonl"

def tail_file(path, num_lines=100):
    if not path.exists():
        return []
    with open(path, "r") as f:
        # A simple readlines() is acceptable for demo scale. 
        # For huge files, a true tail -n is better.
        lines = f.readlines()
        return lines[-num_lines:]

@app.get("/api/current_state")
def get_current_state():
    state = {}
    
    # 1. Get latest window per IP
    lines = tail_file(windows_log_path, 500)
    for line in lines:
        if not line.strip(): continue
        try:
            w = json.loads(line)
            ip = w["client_ip"]
            state[ip] = {
                "latest_window": w,
                "risk": 0.0,
                "forecastability": 0.0
            }
        except Exception:
            pass
            
    # 2. Get latest risk/forecastability per IP
    f_lines = tail_file(forecasts_log_path, 500)
    for line in f_lines:
        if not line.strip(): continue
        try:
            f = json.loads(line)
            ip = f["client_ip"]
            if ip in state:
                state[ip]["risk"] = f.get("threat_risk", 0.0)
                state[ip]["forecastability"] = f.get("forecastability", 0.0)
        except Exception:
            pass
            
    return {"client_states": state}

@app.get("/api/forecast_summary")
def get_forecast_summary():
    # To get the exact running summary, we need to replicate the verify_forecasts.py logic
    # or just read from a summary state file. Since verify_forecasts.py doesn't write to a file,
    # we will do a fast pass over the logs.
    stats = {"made": 0, "correct": 0, "false": 0, "missed": 0, "lead_times": []}
    active_forecasts = {}
    
    w_lines = tail_file(windows_log_path, 2000)
    f_lines = tail_file(forecasts_log_path, 2000)
    
    # Read forecasts
    for line in f_lines:
        if not line.strip(): continue
        try:
            fc = json.loads(line)
            ip = fc["client_ip"]
            if ip not in active_forecasts:
                active_forecasts[ip] = fc
                stats["made"] += 1
        except:
            pass
            
    # Read windows
    for line in w_lines:
        if not line.strip(): continue
        try:
            w = json.loads(line)
            ip = w["client_ip"]
            current_ts = w["window_end_time"]
            attack_present = w.get("request_count", 0) > 15 or w.get("failed_request_pct", 0.0) > 0.2
            
            if ip in active_forecasts:
                fc = active_forecasts[ip]
                expiry = fc["timestamp"] + fc["forecast_window_seconds"]
                
                if attack_present:
                    lead_time = max(0, current_ts - fc["timestamp"])
                    stats["correct"] += 1
                    stats["lead_times"].append(lead_time)
                    del active_forecasts[ip]
                elif current_ts > expiry:
                    stats["false"] += 1
                    del active_forecasts[ip]
            else:
                if attack_present:
                    # simplistic: every window that is an attack without an active forecast adds a missed
                    # in reality we'd debounce this.
                    stats["missed"] += 1
        except:
            pass
            
    avg_lead = sum(stats["lead_times"]) / len(stats["lead_times"]) if stats["lead_times"] else 0
    return {
        "forecasts_made": stats["made"],
        "correct": stats["correct"],
        "false": stats["false"],
        "missed": stats["missed"],
        "avg_lead_time_seconds": round(avg_lead, 1)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.live_server:app", host="0.0.0.0", port=8000, reload=True)
