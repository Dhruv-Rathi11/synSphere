import sys
import os
import time

# Ensure stdout uses utf-8
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

from fastapi.testclient import TestClient
from main import app, init_db
from database import SessionLocal, Record, ConflictLog

def run_tests():
    init_db()
    client = TestClient(app)

    print("\n--- TEST 1: Health Check ---")
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print("[PASS] Health Check:", resp.json())

    print("\n--- TEST 2: Reset & Check Baseline Record ---")
    resp = client.post("/api/v1/reset")
    assert resp.status_code == 200
    resp = client.get("/api/v1/records/PAT-2026-01")
    assert resp.status_code == 200
    rec = resp.json()
    assert rec["current_rev"] == "1-base00"
    print("[PASS] Baseline Record Seeded:", rec["id"], rec["current_rev"], rec["data"]["name"])

    print("\n--- TEST 3: Fast-Path Direct Commit (Worker A) ---")
    payload_a = {
        "record_id": "PAT-2026-01",
        "parent_rev": "1-base00",
        "worker_id": "worker-a-anm",
        "worker_role": "Auxiliary Nurse Midwife (ANM)",
        "timestamp": "2026-09-15T10:00:00Z",
        "gps_accuracy_meters": 3.2,
        "data": {
            "vaccine_status": "Completed",
            "batch_no": "COV-8902-IND",
            "notes": "Administered 1st dose at Rampur PHC"
        }
    }
    resp = client.post("/api/v1/sync", json=payload_a)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["status"] == "COMMITTED"
    assert res_data["new_rev"].startswith("2-")
    print("[PASS] Fast-Path Commit -> New Rev:", res_data["new_rev"])

    print("\n--- TEST 4: Collision Path (Worker B Concurrent Offline Mutation) ---")
    payload_b = {
        "record_id": "PAT-2026-01",
        "parent_rev": "1-base00",  # Divergent! Server is now at 2-xxxx
        "worker_id": "worker-b-surveyor",
        "worker_role": "Community Field Surveyor",
        "timestamp": "2026-09-15T10:15:00Z",
        "gps_accuracy_meters": 14.8,
        "data": {
            "vaccine_status": "Pending",
            "batch_no": "",
            "notes": "Door-to-door survey: Patient absent in fields"
        }
    }
    resp = client.post("/api/v1/sync", json=payload_b)
    assert resp.status_code == 200
    res_conflict = resp.json()
    assert res_conflict["status"] == "COLLISION_FORKED"
    assert "conflict_id" in res_conflict
    conflict_id = res_conflict["conflict_id"]
    print("[PASS] Collision Forked -> Conflict ID:", conflict_id)

    print("\n--- TEST 5: Verify Conflict Logs & Asynchronous Gemini Triage ---")
    # In TestClient, background tasks run synchronously during request cycle
    resp = client.get("/api/v1/conflicts")
    assert resp.status_code == 200
    conflicts = resp.json()
    assert len(conflicts) >= 1
    conflict_entry = conflicts[0]
    assert conflict_entry["base_rev"] == "1-base00"
    assert conflict_entry["status"] == "PENDING_REVIEW"
    
    # Check AI triage output
    if not conflict_entry.get("ai_triage"):
        # Explicitly trigger triage endpoint if background task is still queuing
        triage_resp = client.post(f"/api/v1/conflicts/{conflict_id}/triage")
        assert triage_resp.status_code == 200
        conflict_entry["ai_triage"] = triage_resp.json().get("ai_triage")

    ai_triage = conflict_entry.get("ai_triage")
    assert ai_triage is not None, "AI triage should be populated"
    assert "summary_of_discrepancy" in ai_triage
    assert "recommended_resolution" in ai_triage
    assert "confidence_score" in ai_triage
    assert "field_diffs" in ai_triage
    print("[PASS] Gemini AI Triage Report Generated:")
    print("       Summary:", ai_triage["summary_of_discrepancy"])
    print("       Recommended Resolution:", ai_triage["recommended_resolution"])
    print("       Confidence Score:", ai_triage["confidence_score"])
    print("       Field Diffs Count:", len(ai_triage["field_diffs"]))

    print("\n--- TEST 6: Supervisor Resolves Conflict with Synthesized Merge ---")
    resolve_payload = {
        "resolved_status": "Completed",
        "batch_no": "COV-8902-IND",
        "notes": "[Synthesized]: Verified by ANM Nurse with batch COV-8902-IND. Survey notes: Patient relocated near school.",
        "resolution_strategy": "SYNTHESIZED_MERGE"
    }
    resp = client.post(f"/api/v1/conflicts/{conflict_id}/resolve", json=resolve_payload)
    assert resp.status_code == 200
    res_resolve = resp.json()
    assert res_resolve["status"] == "RESOLVED"
    assert res_resolve["new_rev"].startswith("3-")
    print("[PASS] Conflict Resolved Successfully -> Server Head Rev:", res_resolve["new_rev"])

    print("\n=======================================================")
    print(" ALL BACKEND MVCC & GEMINI 2.5 FLASH TESTS PASSED! ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
