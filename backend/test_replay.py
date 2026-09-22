import time
import json
import os
from pathlib import Path

# ==============================================================================
# TEST DATA ONLY - LOCAL REPLAY SCRIPT
# This script injects fake, escalating data into windows_log.jsonl purely to 
# verify the forecast_engine and verify_forecasts logic fires correctly.
# DO NOT USE IN PRODUCTION OR LIVE DEMO.
# ==============================================================================

backend_dir = Path(__file__).resolve().parent
windows_log_path = backend_dir / "windows_log.jsonl"

def inject_window(ip, request_count, failed_pct, new_endpoint):
    window = {
        "window_end_time": time.time(),
        "client_ip": ip,
        "request_count": request_count,
        "unique_endpoints_count": 3,
        "failed_request_pct": failed_pct,
        "avg_time_between_requests_ms": 1000.0 if request_count < 10 else 200.0,
        "new_endpoint_flag": new_endpoint
    }
    with open(windows_log_path, "a") as f:
        f.write(json.dumps(window) + "\n")
    print(f"Injecting: reqs={request_count}, fails={failed_pct:.0%}, new_ep={new_endpoint}")

def main():
    print("==============================================")
    print(" TEST DATA ONLY - STARTING FAKE TRAFFIC INJECT")
    print("==============================================")
    
    test_ip = "999.999.999.999"
    
    # 1. Normal
    inject_window(test_ip, request_count=5, failed_pct=0.0, new_endpoint=False)
    time.sleep(10)
    
    # 2. New endpoint explored
    inject_window(test_ip, request_count=6, failed_pct=0.0, new_endpoint=True)
    time.sleep(10)
    
    # 3. Rising request count (Escalation)
    inject_window(test_ip, request_count=12, failed_pct=0.0, new_endpoint=False)
    time.sleep(10)
    
    # 4. Rising failure rate (Triggers forecast in Part 3)
    inject_window(test_ip, request_count=14, failed_pct=0.15, new_endpoint=False)
    print("\n>>> Check forecast_engine.py terminal. It should have just emitted a forecast! <<<")
    time.sleep(10)
    
    # 5. Full Attack (Triggers CORRECT forecast in Part 4)
    # Part 4's attack threshold is req > 15 or fail > 0.2
    inject_window(test_ip, request_count=25, failed_pct=0.4, new_endpoint=False)
    print("\n>>> Check verify_forecasts.py terminal. It should have marked it CORRECT! <<<")
    
    print("\nTest replay finished.")

if __name__ == "__main__":
    main()
