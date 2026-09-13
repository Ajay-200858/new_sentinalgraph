# SentinelGraph Technical Architecture

## Overview
SentinelGraph applies dynamic temporal graph learning to raw network traffic to catch and forecast anomalous patterns.

## Data Ingestion & Preprocessing
- Raw CIC-IDS2017 dataset is ingested and cleaned.
- Missing values and inf values are removed.
- Labels are strictly mapped to 5 classes: `BENIGN`, `DoS`, `DDoS`, `PortScan`, `Infiltration`.
- Temporal order is preserved, and IPs are encoded as node handles.

## ML/DL Models
- **Logistic Regression & Random Forest:** Implemented via Scikit-Learn for baseline comparison.
- **TGN (Temporal Graph Network):** Custom PyTorch implementation that processes edge events chronologically. Maintains node states via `NodeMemory`.

## Database Schema
- **NetworkFlow:** Raw traffic metadata.
- **Prediction:** Model classification outputs.
- **Forecast:** Temporal risk projections.
- **SecurityEvent:** Detected attacks stored with computed risk and MITRE ATT&CK mappings.
- **Notification:** Caspian alerting audit logs.

## Frontend & Backend
- **Backend:** FastAPI serving REST APIs and managing database interactions.
- **Frontend:** HTML/JS/CSS dashboard communicating with backend APIs to render real-time telemetry.

## Integrations
- **Caspian:** Integrated for out-of-band Discord and Telegram notifications upon high-risk detection.
