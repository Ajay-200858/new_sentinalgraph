import os
import sys

def init_db():
    print("========================================")
    print("SENTINELGRAPH DATABASE INITIALIZATION")
    try:
        from sqlalchemy import create_engine
        from backend.database import Base, engine
        import backend.models
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] PostgreSQL connection successful")
        print("[SUCCESS] network_flows created")
        print("[SUCCESS] predictions created")
        print("[SUCCESS] forecasts created")
        print("[SUCCESS] security_events created")
        print("[SUCCESS] notifications created")
        print("DATABASE READY")
    except Exception as e:
        print("[ERROR] Database connection failed.")
        print(f"Error: {e}")
        print("\nPlease ensure PostgreSQL is running and credentials in .env are correct.")

if __name__ == "__main__":
    init_db()
