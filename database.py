import os
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./syncsphere.db")

# Use JSONB on PostgreSQL and fallback to standard JSON for SQLite
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
UUID_TYPE = String(36)

# Configure SQLAlchemy engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Record(Base):
    """
    Primary server-side record model with MVCC revision tracking.
    """
    __tablename__ = "records"

    id = Column(String, primary_key=True, index=True)
    current_rev = Column(String, nullable=False, default="1-base00")
    data = Column(JSON_TYPE, nullable=False)
    last_updated_by = Column(String, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    conflict_logs = relationship("ConflictLog", back_populates="record", cascade="all, delete-orphan")


class ConflictLog(Base):
    """
    Asynchronous semantic triage queue for divergent MVCC forks.
    """
    __tablename__ = "conflict_logs"

    conflict_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    record_id = Column(String, ForeignKey("records.id"), nullable=False, index=True)
    base_rev = Column(String, nullable=False)
    active_branch = Column(JSON_TYPE, nullable=False)
    incoming_branch = Column(JSON_TYPE, nullable=False)
    ai_triage = Column(JSON_TYPE, nullable=True)
    status = Column(String, default="PENDING_REVIEW")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    record = relationship("Record", back_populates="conflict_logs")


def get_db():
    """
    FastAPI dependency yielding database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize schema tables and seed the baseline patient record if missing.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        baseline_id = "PAT-2026-01"
        existing = db.query(Record).filter(Record.id == baseline_id).first()
        if not existing:
            baseline_record = Record(
                id=baseline_id,
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
            db.add(baseline_record)
            db.commit()
    finally:
        db.close()
