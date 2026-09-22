# Tomorrow's Demo Checklist

Follow these steps in order tomorrow when you have access to the Victus laptop and network:

- [ ] 1. Set up Victus, connect to same WiFi as phone/laptop
- [ ] 2. Run `python -m uvicorn backend.live_server:app --host 0.0.0.0 --port 8000` on Victus, note its LAN IP
- [ ] 3. Browse the server for real from phone + laptop for a few minutes to seed real windows
- [ ] 4. Open 3 new terminal windows on the Victus and run:
      - `python backend/window_builder.py`
      - `python backend/forecast_engine.py`
      - `python backend/verify_forecasts.py`
- [ ] 5. Wire `get_current_risk()` in `forecast_engine.py` to the real TGN/RF model instead of the placeholder
- [ ] 6. Run a real load-testing burst (using `hey` or a Python requests loop) as the controlled attack
- [ ] 7. Confirm a real forecast fires before the burst is "obviously" an attack, and check the lead time on the verifier output
- [ ] 8. Send your frontend teammate the LAN IP + `api_contract.md` so the frontend can point at it
