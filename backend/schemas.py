from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Explanation(BaseModel):
    reasons: List[str]

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    risk_score: float
    severity: str
    mitre_tactic: str
    explanation: List[str]

class SystemStatus(BaseModel):
    status: str
    database: str
    models: str

class FlowUploadResponse(BaseModel):
    message: str
    flows_processed: int
    attacks_detected: int
    high_risk_events: int
    current_risk: int
    alerts_sent: Optional[int] = 0
    alert_details: Optional[str] = None

class SecurityEventSchema(BaseModel):
    id: int
    timestamp: datetime
    source_ip: str
    destination_ip: str
    attack_type: str
    risk_score: float
    severity: str
    mitre_tactic: str
    mitre_technique: str
    explanation: List[str]
    
    class Config:
        from_attributes = True

class DashboardSummary(BaseModel):
    total_flows: int
    attacks_detected: int
    high_risk_events: int
    current_risk: int
    attack_distribution: dict
    model_performance: dict
    forecast_projection: dict


# ---------------------------------------------------------------------------
# TGN-specific schemas  (optional; main.py does NOT use these directly)
# ---------------------------------------------------------------------------

class TGNPredictionResponse(PredictionResponse):
    """
    Extends PredictionResponse with optional TGN metadata fields.
    Returned when calling the TGN inference path and extra context is needed.
    Old PredictionResponse is unchanged -- main.py continues to work.
    """
    model_type: Optional[str] = "Temporal Graph Network"
    architecture: Optional[str] = "simplified_TGN"
    memory_enabled: Optional[bool] = True
    time_encoding_enabled: Optional[bool] = True
    message_function_enabled: Optional[bool] = True
    gru_memory_update_enabled: Optional[bool] = True
    forecast_type: Optional[str] = "baseline_temporal_forecast"


class TGNForecastResponse(BaseModel):
    """
    Schema for the baseline_temporal_forecast returned by
    model_service.get_forecast() and tgn_core.forecast_next_window().
    """
    forecast_type: str          # always "baseline_temporal_forecast"
    window_minutes: int
    predicted_risk: int
    risk_trend: str             # "rising" | "stable" | "falling"
    attack_probability: float
    dominant_attack: str
    repeated_pairs: int
    avg_pkt_rate: Optional[float] = None
    avg_byte_rate: Optional[float] = None
    class_frequency: Optional[dict] = None
    confidence: str             # "very_low" | "low" | "medium"
    events_analysed: int
    note: str

