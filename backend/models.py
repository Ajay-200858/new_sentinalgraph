from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class NetworkFlow(Base):
    __tablename__ = "network_flows"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source_ip = Column(String, index=True)
    destination_ip = Column(String, index=True)
    source_port = Column(Integer)
    destination_port = Column(Integer)
    protocol = Column(String)
    label = Column(String)
    features = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("Prediction", back_populates="flow")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    flow_id = Column(Integer, ForeignKey("network_flows.id"))
    model_name = Column(String)
    predicted_class = Column(String)
    confidence = Column(Float)
    risk_score = Column(Float)
    prediction_type = Column(String) # e.g., "classification", "tgn_forecast"
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    flow = relationship("NetworkFlow", back_populates="predictions")
    forecasts = relationship("Forecast", back_populates="prediction")


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"))
    forecast_horizon = Column(String) # e.g., "1 MIN", "3 MIN", "5 MIN"
    future_attack_type = Column(String)
    probability = Column(Float)
    risk_level = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    prediction = relationship("Prediction", back_populates="forecasts")


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source_ip = Column(String)
    destination_ip = Column(String)
    attack_type = Column(String)
    risk_score = Column(Float)
    severity = Column(String)
    mitre_tactic = Column(String)
    mitre_technique = Column(String)
    explanation = Column(JSONB)
    status = Column(String, default="NEW")
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    security_event_id = Column(Integer, ForeignKey("security_events.id"))
    channel = Column(String) # e.g., "log", "caspian"
    recipient = Column(String)
    message = Column(Text)
    status = Column(String) # e.g., "PENDING", "SENT", "FAILED"
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
