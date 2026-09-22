import time
import json
import os
from collections import defaultdict
from pathlib import Path

# Paths
backend_dir = Path(__file__).resolve().parent
requests_log_path = backend_dir / "requests_log.jsonl"
windows_log_path = backend_dir / "windows_log.jsonl"

def process_window(window_records, seen_endpoints_per_ip):
    # Group by client_ip
    ip_records = defaultdict(list)
    for record in window_records:
        ip_records[record["client_ip"]].append(record)
        
    window_rows = []
    
    for ip, records in ip_records.items():
        # Sort by timestamp to calculate avg time between requests
        records.sort(key=lambda x: x["timestamp"])
        
        request_count = len(records)
        endpoints_in_window = set(r["endpoint"] for r in records)
        unique_endpoints_count = len(endpoints_in_window)
        
        failed_count = sum(1 for r in records if r["status_code"] >= 400)
        failed_request_pct = failed_count / request_count if request_count > 0 else 0.0
        
        avg_time_between_requests_ms = 0.0
        if request_count > 1:
            times = [r["timestamp"] for r in records]
            diffs = [times[i] - times[i-1] for i in range(1, len(times))]
            avg_time_between_requests_ms = (sum(diffs) / len(diffs)) * 1000
            
        # New endpoint flag
        new_endpoint_flag = False
        for ep in endpoints_in_window:
            if ep not in seen_endpoints_per_ip[ip]:
                new_endpoint_flag = True
                seen_endpoints_per_ip[ip].add(ep)
                
        window_row = {
            "window_end_time": time.time(),
            "client_ip": ip,
            "request_count": request_count,
            "unique_endpoints_count": unique_endpoints_count,
            "failed_request_pct": failed_request_pct,
            "avg_time_between_requests_ms": avg_time_between_requests_ms,
            "new_endpoint_flag": new_endpoint_flag
        }
        window_rows.append(window_row)
        
    return window_rows

def main():
    print("Starting window builder. Aggregating traffic every 10 seconds...")
    
    seen_endpoints_per_ip = defaultdict(set)
    last_position = 0
    
    # Optional: read past the current end of file if we only want live data
    if requests_log_path.exists():
        last_position = requests_log_path.stat().st_size
    
    while True:
        time.sleep(10)
        
        if not requests_log_path.exists():
            continue
            
        # Read new records
        window_records = []
        with open(requests_log_path, "r") as f:
            f.seek(last_position)
            for line in f:
                if line.strip():
                    try:
                        record = json.loads(line)
                        window_records.append(record)
                    except json.JSONDecodeError:
                        pass
            last_position = f.tell()
            
        if not window_records:
            continue
            
        window_rows = process_window(window_records, seen_endpoints_per_ip)
        
        if window_rows:
            print(f"\n--- Window Ended at {time.strftime('%X')} ---")
            with open(windows_log_path, "a") as out_f:
                for row in window_rows:
                    print(json.dumps(row, indent=2))
                    out_f.write(json.dumps(row) + "\n")

if __name__ == "__main__":
    main()
