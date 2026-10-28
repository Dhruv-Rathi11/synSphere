import sys
import os
from datetime import datetime, timezone

# Ensure stdout uses utf-8 on Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

from database import SessionLocal, Record, ConflictLog, init_db

def seed_demo_environment():
    """
    Resets the SyncSphere backend database to a pristine demo state:
    - Clears all conflict logs
    - Resets/creates baseline patient PAT-2026-01 (rev: 1-base00)
    """
    init_db()
    db = SessionLocal()
    try:
        print("[SELLER] Resetting SyncSphere Database for Hackathon Presentation...")
        
        # 1. Clear all previous conflict logs
        num_conflicts_deleted = db.query(ConflictLog).delete()
        print(f"[CLEAN] Cleared {num_conflicts_deleted} previous conflict log(s).")

        # 2. Reset or recreate baseline patient record
        db.query(Record).filter(Record.id == "PAT-2026-01").delete()

        baseline_patient = Record(
            id="PAT-2026-01",
            current_rev="1-base00",
            data={
                "name": "Ravi Kumar",
                "age": 24,
                "village": "Rampur",
                "vaccine_status": "Pending",
                "batch_no": "",
                "notes": "Baseline household survey registered",
                "updated_at": "2026-09-01T08:00:00Z"
            },
            last_updated_by="system_baseline_seeder",
            updated_at=datetime.now(timezone.utc)
        )

        db.add(baseline_patient)
        db.commit()

        print("[SUCCESS] Baseline record seeded successfully:")
        print(f"          - ID: {baseline_patient.id}")
        print(f"          - Revision Head: {baseline_patient.current_rev}")
        print(f"          - Patient Name: {baseline_patient.data['name']}")
        print(f"          - Vaccine Status: {baseline_patient.data['vaccine_status']}")
        print("\n=======================================================")
        print(" DEMO DATABASE READY FOR JUDGES PRESENTATION! ")
        print("=======================================================\n")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed demo environment: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_environment()
