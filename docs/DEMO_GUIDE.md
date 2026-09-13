# SentinelGraph: Demo Guide

## Setup
1. **Start Database:** Ensure PostgreSQL is running.
2. **Backend:**
   ```bash
   python -m uvicorn backend.main:app --port 8000
   ```
3. **Frontend:**
   Access the frontend via `http://localhost:8000/`.

## Walkthrough

### 1. The Real-time Dashboard
- Open the Dashboard to see total flows, risk score, and real-time distribution of 5 supported classes: BENIGN, DoS, DDoS, PortScan, and Infiltration.

### 2. Traffic Analysis (Upload)
- Navigate to the **Analyze** page.
- Upload the `demo_five_class_sample.csv` (provided in the `data/` folder).
- Observe the upload process extracting features and sending data to the TGN model.

### 3. Caspian Alerts
- Show how detected high-risk anomalies automatically trigger webhook notifications to configured Discord and Telegram channels.

### 4. Forecasts
- Show the **Forecasts** tab, demonstrating the temporal-risk projection indicating risk trajectory for the next 1-5 minutes based on recent packet-rate trends and attack frequencies.
