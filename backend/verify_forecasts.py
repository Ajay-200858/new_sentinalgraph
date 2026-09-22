import time
import json
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
windows_log_path = backend_dir / "windows_log.jsonl"
forecasts_log_path = backend_dir / "forecasts_log.jsonl"

def is_attack_state(window):
    # Determine if a window constitutes a realized attack
    # E.g. high volume or high failure rate
    return window.get("request_count", 0) > 15 or window.get("failed_request_pct", 0.0) > 0.2

def print_summary(stats):
    avg_lead = 0
    if len(stats["lead_times"]) > 0:
        avg_lead = sum(stats["lead_times"]) / len(stats["lead_times"])
        
    print(f"Forecasts made: {stats['made']} | Correct: {stats['correct']} | "
          f"False: {stats['false']} | Missed: {stats['missed']} | "
          f"Avg lead time: {avg_lead:.1f} sec")

def main():
    print("Starting forecast verifier...")
    
    active_forecasts = {} # ip -> forecast_event
    stats = {
        "made": 0,
        "correct": 0,
        "false": 0,
        "missed": 0,
        "lead_times": []
    }
    
    last_windows_pos = 0
    if windows_log_path.exists():
        last_windows_pos = windows_log_path.stat().st_size
        
    last_forecasts_pos = 0
    if forecasts_log_path.exists():
        last_forecasts_pos = forecasts_log_path.stat().st_size
        
    print_summary(stats)
        
    while True:
        time.sleep(2)
        changed = False
        
        # 1. Read new forecasts
        if forecasts_log_path.exists():
            with open(forecasts_log_path, "r") as f:
                f.seek(last_forecasts_pos)
                for line in f:
                    if line.strip():
                        try:
                            fc = json.loads(line)
                            ip = fc["client_ip"]
                            # Only register if we don't already have an active one tracking
                            if ip not in active_forecasts:
                                active_forecasts[ip] = fc
                                stats["made"] += 1
                                changed = True
                        except json.JSONDecodeError:
                            pass
                last_forecasts_pos = f.tell()
                
        # 2. Read new windows
        if windows_log_path.exists():
            with open(windows_log_path, "r") as f:
                f.seek(last_windows_pos)
                for line in f:
                    if line.strip():
                        try:
                            window = json.loads(line)
                            ip = window["client_ip"]
                            current_ts = window["window_end_time"]
                            
                            attack_present = is_attack_state(window)
                            
                            if ip in active_forecasts:
                                fc = active_forecasts[ip]
                                expiry = fc["timestamp"] + fc["forecast_window_seconds"]
                                
                                if attack_present:
                                    # Correct forecast!
                                    lead_time = current_ts - fc["timestamp"]
                                    if lead_time < 0: lead_time = 0
                                    stats["correct"] += 1
                                    stats["lead_times"].append(lead_time)
                                    del active_forecasts[ip]
                                    changed = True
                                    print(f"\n[+] CORRECT FORECAST for {ip} (Lead time: {lead_time:.1f}s)")
                                elif current_ts > expiry:
                                    # Window expired without an attack
                                    stats["false"] += 1
                                    del active_forecasts[ip]
                                    changed = True
                                    print(f"\n[-] FALSE FORECAST for {ip} (Window expired)")
                            else:
                                # No active forecast for this IP
                                if attack_present:
                                    # But an attack occurred!
                                    stats["missed"] += 1
                                    changed = True
                                    print(f"\n[!] MISSED FORECAST for {ip} (Attack occurred with no warning)")
                                    
                        except json.JSONDecodeError:
                            pass
                last_windows_pos = f.tell()
                
        if changed:
            print_summary(stats)

if __name__ == "__main__":
    main()
