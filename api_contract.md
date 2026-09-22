# SentinelGraph Live Traffic API Contract

This document outlines the two read-only REST endpoints provided by the live traffic server for the frontend to consume.

## 1. Current State
**Endpoint**: `GET /api/current_state`

Returns a map of all active IPs seen recently, along with their latest 10-second traffic window features, the real-time threat risk, and their calculated forecastability score.

### Example Response
```json
{
  "client_states": {
    "192.168.1.50": {
      "latest_window": {
        "window_end_time": 1716382000.123,
        "client_ip": "192.168.1.50",
        "request_count": 22,
        "unique_endpoints_count": 4,
        "failed_request_pct": 0.15,
        "avg_time_between_requests_ms": 450.5,
        "new_endpoint_flag": true
      },
      "risk": 0.75,
      "forecastability": 0.82
    },
    "10.0.0.12": {
      "latest_window": {
        "window_end_time": 1716382000.890,
        "client_ip": "10.0.0.12",
        "request_count": 2,
        "unique_endpoints_count": 1,
        "failed_request_pct": 0.0,
        "avg_time_between_requests_ms": 5000.0,
        "new_endpoint_flag": false
      },
      "risk": 0.1,
      "forecastability": 0.0
    }
  }
}
```

## 2. Forecast Summary
**Endpoint**: `GET /api/forecast_summary`

Returns the running totals of forecast accuracy across the session. A forecast is "made" when an IP exhibits an escalating precursor pattern. It resolves as "correct" if an actual high-volume or high-error attack materializes within 45 seconds, or "false" otherwise.

### Example Response
```json
{
  "forecasts_made": 14,
  "correct": 12,
  "false": 2,
  "missed": 1,
  "avg_lead_time_seconds": 18.4
}
```
