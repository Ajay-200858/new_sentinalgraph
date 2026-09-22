import requests
import pandas as pd
import io
from backend.database import engine
from sqlalchemy import text

BASE_URL = 'http://127.0.0.1:8000'

# Read initial row count
with engine.connect() as conn:
    flow_count_before = conn.execute(text("SELECT count(*) FROM network_flows")).scalar()
    pred_count_before = conn.execute(text("SELECT count(*) FROM predictions")).scalar()
    event_count_before = conn.execute(text("SELECT count(*) FROM security_events")).scalar()
    infil_before = conn.execute(text("SELECT count(*) FROM security_events WHERE attack_type = 'Infiltration'")).scalar()

print(f"Before upload:")
print(f"  network_flows: {flow_count_before}")
print(f"  predictions: {pred_count_before}")
print(f"  security_events: {event_count_before}")
print(f"  Infiltration events: {infil_before}")

# Upload a single Infiltration flow
df = pd.read_csv('data/sentinelgraph_real_temporal_10k.csv')
infil_row = df[df['Attack_Label'] == 'Infiltration'].head(1)

csv_buf = io.BytesIO()
infil_row.to_csv(csv_buf, index=False)
csv_buf.seek(0)

files = {'file': ('infil_test.csv', csv_buf.getvalue(), 'text/csv')}
r = requests.post(f'{BASE_URL}/api/v1/upload', files=files)
print(f"\nUpload response status: {r.status_code}")
print(f"Upload response: {r.json()}")

with engine.connect() as conn:
    flow_count_after = conn.execute(text("SELECT count(*) FROM network_flows")).scalar()
    pred_count_after = conn.execute(text("SELECT count(*) FROM predictions")).scalar()
    event_count_after = conn.execute(text("SELECT count(*) FROM security_events")).scalar()
    infil_after = conn.execute(text("SELECT count(*) FROM security_events WHERE attack_type = 'Infiltration'")).scalar()

    # Query the latest flow and prediction
    latest_flow = conn.execute(text("SELECT id, source_ip, destination_ip, label FROM network_flows ORDER BY id DESC LIMIT 1")).mappings().fetchone()
    latest_pred = conn.execute(text("SELECT id, flow_id, predicted_class, confidence, risk_score FROM predictions ORDER BY id DESC LIMIT 1")).mappings().fetchone()

print(f"\nAfter upload:")
print(f"  network_flows: {flow_count_after} (added: {flow_count_after - flow_count_before})")
print(f"  predictions: {pred_count_after} (added: {pred_count_after - pred_count_before})")
print(f"  security_events: {event_count_after} (added: {event_count_after - event_count_before})")
print(f"  Infiltration events: {infil_after} (added: {infil_after - infil_before})")
print(f"  Latest flow: {dict(latest_flow)}")
print(f"  Latest prediction: {dict(latest_pred)}")

assert flow_count_after == flow_count_before + 1, "Exactly 1 flow should be added (no accidental duplicates)"
assert pred_count_after == pred_count_before + 1, "Exactly 1 prediction should be added (no accidental duplicates)"
print("\nPostgreSQL Database Infiltration & No-Duplicate verification: SUCCESS!")
