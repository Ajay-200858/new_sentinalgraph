# SentinelGraph — AI-Based Network Attack Forecasting

> SIH26153 | Smart India Hackathon | Theme: Blockchain & Cybersecurity | NTRO

A temporal graph neural network (TGN) system that watches network traffic as a
changing graph over time and **forecasts what is likely to happen next**, mapped
to real attacker-behaviour stages (MITRE ATT&CK).

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
.\venv\Scripts\activate    # Windows

# 2. Install dependencies
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install torch-geometric pandas numpy scikit-learn tqdm requests plotly streamlit shap networkx

# 3. Run Phase 1 validation
python notebooks/01_data_exploration.py

# 4. Launch demo (Phase 6)
# streamlit run demo/app.py
```

## Architecture

```
Raw CSV → Data Loader → Graph Builder → [Sliding Windows] → TGN Model → Prediction
                                              ↓                            ↓
                                        Baseline Models             MITRE ATT&CK Stage
                                     (LR, Random Forest)          + Explainability
```

## Project Structure

```
cyber_forecasting/
├── config.py              # Global configuration
├── requirements.txt       # Dependencies
├── src/
│   ├── data_loader.py     # Load & clean CIC-IDS-2018
│   ├── graph_builder.py   # CSV → temporal graph snapshots
│   ├── mitre_mapping.py   # Attack → ATT&CK stage lookup
│   └── utils.py           # Shared helpers
├── notebooks/
│   └── 01_data_exploration.py  # Phase 1 validation
├── models/                # Saved checkpoints
├── demo/                  # Streamlit app
└── docs/                  # Architecture documentation
```

## Dataset

- **Primary:** CIC-IDS-2018 (University of New Brunswick)
- **Format:** Flow-level CSV from CICFlowMeter
- **Attack types:** Brute Force, DoS, DDoS, Web Attack, Bot, Infiltration

## Tech Stack

| Component | Tool |
|---|---|
| Core Model | PyTorch + PyG (`TGNMemory`) |
| Baselines | scikit-learn |
| Explainability | Attention weights / SHAP |
| Demo | Streamlit + Plotly |
