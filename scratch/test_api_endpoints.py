import requests
import json
import pandas as pd
import io

BASE_URL = 'http://127.0.0.1:8000'

print('=== 1. TEST /health ===')
r = requests.get(f'{BASE_URL}/health')
print(f'Status: {r.status_code}, Response: {r.json()}')
assert r.status_code == 200
assert r.json()['status'] == 'ok'
assert r.json()['database'] == 'connected'
assert r.json()['models'] == 'loaded'

print('\n=== 2. TEST /api/v1/summary ===')
r = requests.get(f'{BASE_URL}/api/v1/summary')
print(f'Status: {r.status_code}')
summary_data = r.json()
print(f'Summary keys: {list(summary_data.keys())}')
print(f'Summary current_risk: {summary_data.get("current_risk")}, total_flows: {summary_data.get("total_flows")}')
assert r.status_code == 200

print('\n=== 3. TEST /api/v1/predictions ===')
r = requests.get(f'{BASE_URL}/api/v1/predictions?limit=5')
print(f'Status: {r.status_code}, Count: {len(r.json())}')
if len(r.json()) > 0:
    print('Sample prediction:', json.dumps(r.json()[0], indent=2))
assert r.status_code == 200

print('\n=== 4. TEST /api/v1/forecast ===')
r = requests.get(f'{BASE_URL}/api/v1/forecast')
print(f'Status: {r.status_code}, Count: {len(r.json())}')
if len(r.json()) > 0:
    print('Sample forecast:', json.dumps(r.json()[0], indent=2))
assert r.status_code == 200

print('\n=== 5. TEST INVALID FILE UPLOAD (.txt file) ===')
files = {'file': ('test.txt', b'this is not a csv', 'text/plain')}
r = requests.post(f'{BASE_URL}/api/v1/upload', files=files)
print(f'Status: {r.status_code}, Detail: {r.json().get("detail")}')
assert r.status_code == 400

print('\n=== 6. TEST EMPTY CSV UPLOAD ===')
files = {'file': ('empty.csv', b'', 'text/csv')}
r = requests.post(f'{BASE_URL}/api/v1/upload', files=files)
print(f'Status: {r.status_code}, Response: {r.json()}')
assert r.status_code in (400, 500)

print('\n=== 7. TEST CSV WITH ALL 5 CLASSES ===')
df = pd.read_csv('data/sentinelgraph_real_temporal_10k.csv')
samples = []
for cls in ['BENIGN', 'DoS', 'DDoS', 'PortScan', 'Infiltration']:
    samples.append(df[df['Attack_Label'] == cls].head(5))
test_5class_df = pd.concat(samples).reset_index(drop=True)
csv_buf = io.BytesIO()
test_5class_df.to_csv(csv_buf, index=False)
csv_buf.seek(0)

files = {'file': ('test_5class.csv', csv_buf.getvalue(), 'text/csv')}
r = requests.post(f'{BASE_URL}/api/v1/upload', files=files)
print(f'Status: {r.status_code}, Response: {r.json()}')
assert r.status_code == 200
upload_resp = r.json()
print(f'Flows processed: {upload_resp["flows_processed"]}')
print(f'Attacks detected: {upload_resp["attacks_detected"]}')
assert upload_resp["flows_processed"] == 25

print('\n=== 8. VERIFY SERVER STILL HEALTHY ===')
r = requests.get(f'{BASE_URL}/health')
assert r.status_code == 200
print('Server healthy:', r.json()['status'])
print('\nALL FASTAPI BACKEND CHECKS PASSED!')
