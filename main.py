import os
import asyncio
from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import (
    Record,
    ConflictLog,
    SessionLocal,
    get_db,
    init_db
)
from triage_schema import SemanticTriageReport
from triage_service import run_semantic_triage


# Pydantic Schemas
class SyncPayload(BaseModel):
    record_id: str = Field(..., description="Target record ID (e.g. PAT-2026-01)")
    parent_rev: str = Field(..., description="The parent revision hash from which this mutation was made")
    worker_id: str = Field(..., description="Unique worker ID")
    worker_role: str = Field(..., description="Worker identity role (e.g. ANM Nurse, Field Surveyor)")
    timestamp: str = Field(..., description="ISO 8601 mutation timestamp")
    gps_accuracy_meters: Optional[float] = Field(default=5.0, description="GPS fix precision in meters")
    gps_coords: Optional[Dict[str, Any]] = Field(default=None, description="Optional GPS coordinates object")
    data: Dict[str, Any] = Field(..., description="Partial or full patient data mutations")


class SyncResponse(BaseModel):
    status: str
    new_rev: Optional[str] = None
    conflict_id: Optional[str] = None
    detail: Optional[str] = None
    ai_triage: Optional[Dict[str, Any]] = None


class ResolveConflictPayload(BaseModel):
    decision: Literal["BRANCH_A", "BRANCH_B", "MERGE"] = Field(
        default="MERGE", description="Decision selection: BRANCH_A, BRANCH_B, or MERGE"
    )
    final_data: Dict[str, Any] = Field(
        default_factory=dict, description="The final merged or chosen patient record attributes"
    )
    # Optional backwards compatibility fields
    resolved_status: Optional[str] = None
    batch_no: Optional[str] = None
    notes: Optional[str] = None
    resolution_strategy: Optional[str] = None


async def process_async_ai_triage(
    conflict_id: str,
    base_rev: str,
    active_branch: Dict[str, Any],
    incoming_branch: Dict[str, Any]
):
    """
    Background worker that runs Gemini 2.5 Flash semantic triage asynchronously and persists the report.
    """
    try:
        report: SemanticTriageReport = await run_semantic_triage(base_rev, active_branch, incoming_branch)
        
        # Save to database in a clean session
        db = SessionLocal()
        try:
            conflict = db.query(ConflictLog).filter(ConflictLog.conflict_id == conflict_id).first()
            if conflict:
                conflict.ai_triage = report.model_dump()
                db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"Error during async AI triage for conflict {conflict_id}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed baseline data on startup
    init_db()
    yield


# FastAPI Application
app = FastAPI(
    title="SyncSphere Core Synchronization Engine",
    description="AI-Powered Offline-First MVCC Data Synchronization API with Gemini 2.5 Flash Semantic Triage",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware for Frontend & Local Hackathon Demos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "SyncSphere Synchronization Engine",
        "ai_model": "Gemini 2.5 Flash via google-genai",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/api/v1/sync", response_model=SyncResponse)
async def sync_mutation(
    payload: SyncPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Core MVCC Ingestion & Collision Detection Endpoint.
    - Fast-Path: If payload.parent_rev == current_record.current_rev -> Commits and increments rev.
    - Collision Path: If payload.parent_rev != current_record.current_rev -> Forks into conflict_logs and triggers Gemini 2.5 Flash triage.
    """
    # 1. Query current server record
    current_record = db.query(Record).filter(Record.id == payload.record_id).first()
    if not current_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record with id '{payload.record_id}' not found on base station."
        )

    # 2. Fast-Path (Non-Conflicting Direct Commit)
    if payload.parent_rev == current_record.current_rev:
        try:
            current_rev_num = int(current_record.current_rev.split('-')[0])
        except (ValueError, IndexError):
            current_rev_num = 1

        new_rev = f"{current_rev_num + 1}-{uuid4().hex[:6]}"

        # Merge patient attributes non-destructively
        updated_data = dict(current_record.data or {})
        updated_data.update(payload.data)

        current_record.data = updated_data
        current_record.current_rev = new_rev
        current_record.last_updated_by = f"{payload.worker_role} ({payload.worker_id})"
        current_record.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(current_record)

        return SyncResponse(
            status="COMMITTED",
            new_rev=new_rev,
            detail=f"Mutation successfully committed to server head revision {new_rev}."
        )

    # 3. Collision Path (MVCC Divergence -> Fork into Conflict Log + Trigger Gemini AI Triage)
    else:
        conflict_id = str(uuid4())
        
        active_branch = {
            "rev": current_record.current_rev,
            "last_updated_by": current_record.last_updated_by,
            "updated_at": current_record.updated_at.isoformat() if current_record.updated_at else None,
            "data": current_record.data
        }

        incoming_branch = payload.model_dump()

        conflict_log = ConflictLog(
            conflict_id=conflict_id,
            record_id=current_record.id,
            base_rev=payload.parent_rev,
            active_branch=active_branch,
            incoming_branch=incoming_branch,
            ai_triage=None,
            status="PENDING_REVIEW",
            created_at=datetime.now(timezone.utc)
        )

        db.add(conflict_log)
        db.commit()
        db.refresh(conflict_log)

        # Dispatch asynchronous Gemini 2.5 Flash Semantic Triage in Background
        background_tasks.add_task(
            process_async_ai_triage,
            conflict_id=conflict_id,
            base_rev=payload.parent_rev,
            active_branch=active_branch,
            incoming_branch=incoming_branch
        )

        return SyncResponse(
            status="COLLISION_FORKED",
            conflict_id=str(conflict_log.conflict_id),
            detail=f"Parent rev '{payload.parent_rev}' diverged from server head '{current_record.current_rev}'. Branch safely preserved in conflict queue with Gemini AI triage initiated."
        )


@app.get("/api/v1/records")
def get_records(db: Session = Depends(get_db)):
    """
    List all active records on the base station.
    """
    records = db.query(Record).all()
    return records


@app.get("/api/v1/records/{record_id}")
def get_record(record_id: str, db: Session = Depends(get_db)):
    """
    Retrieve single record state and current revision head.
    """
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@app.get("/api/v1/conflicts")
def get_conflicts(
    unresolved_only: bool = Query(default=False, description="Filter for pending conflicts only"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all unresolved conflicts with their parsed ai_triage JSON for the Supervisor Review Portal.
    """
    query = db.query(ConflictLog)
    if unresolved_only:
        query = query.filter(ConflictLog.status == "PENDING_REVIEW")
    
    conflicts = query.order_by(ConflictLog.created_at.desc()).all()
    return conflicts


@app.post("/api/v1/conflicts/{conflict_id}/triage")
async def trigger_conflict_triage(conflict_id: str, db: Session = Depends(get_db)):
    """
    Explicitly triggers / re-runs Gemini 2.5 Flash Semantic Triage on a specific conflict log.
    """
    conflict = db.query(ConflictLog).filter(ConflictLog.conflict_id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict log not found")

    report = await run_semantic_triage(
        base_rev=conflict.base_rev,
        branch_a=conflict.active_branch,
        branch_b=conflict.incoming_branch
    )

    conflict.ai_triage = report.model_dump()
    db.commit()
    db.refresh(conflict)

    return {
        "status": "TRIAGE_COMPLETE",
        "conflict_id": conflict_id,
        "ai_triage": conflict.ai_triage
    }


@app.post("/api/v1/conflicts/{conflict_id}/resolve")
def resolve_conflict(conflict_id: str, payload: ResolveConflictPayload, db: Session = Depends(get_db)):
    """
    Supervisor resolution endpoint:
    - Accepts: {"decision": "BRANCH_A" | "BRANCH_B" | "MERGE", "final_data": dict}
    - Updates main Record to resolved data, sets new revision hash, and marks status as RESOLVED.
    """
    conflict = db.query(ConflictLog).filter(ConflictLog.conflict_id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict log not found")

    record = db.query(Record).filter(Record.id == conflict.record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Associated record not found")

    try:
        current_rev_num = int(record.current_rev.split('-')[0])
    except (ValueError, IndexError):
        current_rev_num = 1

    new_rev = f"{current_rev_num + 1}-mrg{uuid4().hex[:4]}"

    # Prepare merged/resolved data dictionary
    merged_data = dict(record.data or {})
    
    if payload.final_data:
        merged_data.update(payload.final_data)
    else:
        if payload.resolved_status:
            merged_data["vaccine_status"] = payload.resolved_status
        if payload.batch_no is not None:
            merged_data["batch_no"] = payload.batch_no
        if payload.notes:
            merged_data["notes"] = payload.notes

    merged_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Update main Record
    record.current_rev = new_rev
    record.data = merged_data
    record.last_updated_by = f"Supervisor Resolution ({payload.decision})"
    record.updated_at = datetime.now(timezone.utc)

    # Mark conflict as RESOLVED
    conflict.status = "RESOLVED"
    
    current_triage = dict(conflict.ai_triage or {})
    current_triage["resolution"] = {
        "decision": payload.decision,
        "final_data": merged_data,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "new_rev": new_rev
    }
    conflict.ai_triage = current_triage

    db.commit()
    db.refresh(record)

    return {
        "status": "RESOLVED",
        "new_rev": new_rev,
        "decision": payload.decision,
        "record": record
    }


@app.post("/api/v1/reset")
def reset_database(db: Session = Depends(get_db)):
    """
    Demo helper to reset server state to default baseline.
    """
    db.query(ConflictLog).delete()
    db.query(Record).delete()

    baseline = Record(
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
    db.add(baseline)
    db.commit()

    return {"status": "RESET_SUCCESS", "baseline_rev": "1-base00"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
