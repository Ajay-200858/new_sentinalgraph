# SentinelGraph: AI-Based Network Attack Forecasting

SentinelGraph is an AI-powered SIEM tool that models network traffic as a dynamic temporal graph to predict and detect malicious activity.

## Features
- **Temporal Graph Network (TGN):** Processes continuous-time edge events.
- **5-Class Attack Detection:** Accurately classifies BENIGN, DoS, DDoS, PortScan, and Infiltration.
- **Temporal Forecasts:** 5-minute statistical risk trajectory predictions based on recent patterns.
- **Caspian Notifications:** Instant alerts to Discord/Telegram.
- **MITRE ATT&CK Mapping:** Associates detected threats with potential tactics and techniques.

## Project Status
**DEMO-READY PROTOTYPE**

## Documentation
- [Demo Guide](docs/DEMO_GUIDE.md)
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Judge Q&A](docs/JUDGE_QA.md)

## Quick Start
```bash
python -m uvicorn backend.main:app --port 8000
```
Then navigate to `http://localhost:8000/`.
