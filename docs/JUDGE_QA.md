# SentinelGraph: Judge Q&A Guide

## Problem
Traditional SIEM systems react to network attacks *after* they occur, lacking the ability to forecast evolving threats in real time.

## Solution
SentinelGraph is an AI-based network attack forecasting system. It consumes network traffic data, extracts node and edge features, and builds a temporal graph to predict future attacks (forecasts) and detect current ones.

## Novelty
We apply Temporal Graph Networks (TGN) specifically to raw CIC-IDS2017 flow data mapped temporally. Rather than treating packets as isolated events, we treat them as a dynamic graph to catch complex multi-stage attacks.

## Machine Learning & Deep Learning Models
- **Logistic Regression & Random Forest:** Fast statistical baselines for real-time anomaly detection.
- **TGN (Temporal Graph Network):** We implemented a custom, simplified continuous-time dynamic graph neural network that maintains `NodeMemory`. 

## TGN Concept & Temporal Graph Representation
The network is modeled as a graph where IP addresses are nodes and flows are edges. The TGN maintains an active memory of recent communication history for every IP, updated sequentially as new flows arrive.

## Five-Minute Forecast Method
Currently, our five-minute forecast acts as a temporal-risk projection based on recent traffic behavior, attack frequency, packet-rate trends, and repeated communication patterns across the graph structure, projecting immediate risk trajectory.

## Tech Stack
- **Database:** PostgreSQL (Stores flows, predictions, events).
- **Backend:** FastAPI (Handles model serving, REST APIs).
- **Frontend:** HTML5/CSS3/Vanilla JS (Visualizes the dynamic graph and real-time dashboard).
- **Alerting:** Caspian integration (Discord/Telegram webhooks).

## MITRE ATT&CK
We provide a possible MITRE ATT&CK technique mapping (e.g., Initial Access, Execution) based on the detected attack signature, aiding incident responders.

## Current Limitations
- This is a **DEMO-READY PROTOTYPE**, not a production-hardened system.
- The TGN implementation uses single-hop memory updates and a statistical baseline forecaster rather than full multi-hop temporal attention.
- We support 5 primary classes (BENIGN, DoS, DDoS, PortScan, Infiltration).

## Future Improvements
- Expand classes to include Botnets and BruteForce.
- Implement full Rossi et al. (2020) multi-hop temporal graph attention.
- Deploy the model natively on GPU clusters for larger throughput.
