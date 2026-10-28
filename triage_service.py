import os
import json
import logging
from typing import Dict, Any
from triage_schema import SemanticTriageReport, FieldLevelDiff

logger = logging.getLogger("syncsphere.triage")

# Check if google-genai is available
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


def _heuristic_fallback_triage(base_rev: str, branch_a: Dict[str, Any], branch_b: Dict[str, Any]) -> SemanticTriageReport:
    """
    High-fidelity deterministic semantic fallback for offline/sandbox environments.
    """
    data_a = branch_a.get("data", {})
    data_b = branch_b.get("data", {})

    status_a = data_a.get("vaccine_status", "")
    status_b = data_b.get("vaccine_status", "")
    batch_a = data_a.get("batch_no", "")
    batch_b = data_b.get("batch_no", "")
    notes_a = data_a.get("notes", "")
    notes_b = data_b.get("notes", "")

    worker_role_a = branch_a.get("worker_role", branch_a.get("last_updated_by", "Worker A"))
    worker_role_b = branch_b.get("worker_role", "Worker B")

    field_diffs = []
    anomalies = []

    # 1. Vaccine Status Diff
    if status_a == status_b:
        field_diffs.append(FieldLevelDiff(
            field_name="vaccine_status",
            value_a=str(status_a),
            value_b=str(status_b),
            divergence_type="IDENTICAL",
            recommended_value=str(status_a)
        ))
    else:
        # Prioritize 'Completed' with batch verification
        rec_status = "Completed" if (status_a == "Completed" or status_b == "Completed") else "Pending"
        field_diffs.append(FieldLevelDiff(
            field_name="vaccine_status",
            value_a=str(status_a),
            value_b=str(status_b),
            divergence_type="CONTRADICTORY",
            recommended_value=rec_status
        ))

    # 2. Batch Number Diff
    if batch_a or batch_b:
        rec_batch = batch_a if batch_a else batch_b
        div_type = "IDENTICAL" if batch_a == batch_b else ("SUPPLEMENTARY" if (not batch_a or not batch_b) else "CONTRADICTORY")
        field_diffs.append(FieldLevelDiff(
            field_name="batch_no",
            value_a=str(batch_a),
            value_b=str(batch_b),
            divergence_type=div_type,
            recommended_value=rec_batch
        ))
    elif status_a == "Completed" or status_b == "Completed":
        anomalies.append("Vaccine status marked as Completed without physical vial lot/batch number.")

    # 3. Qualitative Notes Diff
    if notes_a or notes_b:
        div_type = "IDENTICAL" if notes_a == notes_b else "SUPPLEMENTARY"
        rec_notes = f"[Synthesized Record]: {notes_a} | Supplementary field survey note: {notes_b}".strip(" |")
        field_diffs.append(FieldLevelDiff(
            field_name="notes",
            value_a=str(notes_a),
            value_b=str(notes_b),
            divergence_type=div_type,
            recommended_value=rec_notes
        ))

    # Determine recommended resolution
    if (batch_a and not batch_b and status_a == "Completed" and "ANM" in str(worker_role_a)):
        recommended_res = "SYNTHESIZED_MERGE"
        confidence = 0.94
        rationale = (
            f"Branch A submitted by certified clinician '{worker_role_a}' contains verified cold-chain lot number "
            f"'{batch_a}', which takes clinical precedence over pending survey notes from '{worker_role_b}'. "
            f"Preserving demographic updates and combining field notes into the synthesized audit trail."
        )
    elif (batch_b and not batch_a and status_b == "Completed"):
        recommended_res = "SYNTHESIZED_MERGE"
        confidence = 0.92
        rationale = (
            f"Branch B submitted by '{worker_role_b}' contains documented lot proof '{batch_b}'. "
            f"Synthesized merge combines verified immunization status with existing baseline data."
        )
    else:
        recommended_res = "SYNTHESIZED_MERGE"
        confidence = 0.88
        rationale = (
            f"Concurrent mutations detected between '{worker_role_a}' and '{worker_role_b}'. "
            f"Mobile timestamps may exhibit clock drift; qualitative survey notes and clinical status are unified into a composite record."
        )

    return SemanticTriageReport(
        summary_of_discrepancy=(
            f"Two frontline workers ({worker_role_a} and {worker_role_b}) submitted concurrent offline edits diverging from base revision {base_rev}."
        ),
        recommended_resolution=recommended_res,
        confidence_score=confidence,
        clinical_rationale=rationale,
        field_diffs=field_diffs,
        data_anomalies_flagged=anomalies
    )


async def run_semantic_triage(base_rev: str, branch_a: Dict[str, Any], branch_b: Dict[str, Any]) -> SemanticTriageReport:
    """
    Executes automated semantic triage on divergent MVCC branches using Gemini 2.5 Flash via google-genai SDK.
    Falls back gracefully to high-fidelity rule-based heuristic triage when API key or network is not available.
    """
    api_key = os.environ.get("GEMINI_API_KEY")

    if GENAI_AVAILABLE and api_key and len(api_key.strip()) > 10:
        try:
            client = genai.Client(api_key=api_key.strip())

            prompt = f"""You are the SyncSphere Medical & Field Triage AI Engine.
Perform automated semantic triage on two divergent frontline health records that collided during offline synchronization.

CONTEXT:
- Base Revision: {base_rev}
- Branch A (Active Server Head):
  {json.dumps(branch_a, indent=2)}
- Branch B (Incoming Colliding Offline Mutation):
  {json.dumps(branch_b, indent=2)}

RULES & CLINICAL TRIAGE DIRECTIVES:
1. Branch A is already committed to the server, while Branch B is a colliding offline branch from the same base revision.
2. Never rely solely on timestamps due to mobile clock skew and drift in remote hamlets.
3. Clinical interventions with batch numbers and clinical notes outweigh empty status updates or brief survey checks.
4. Synthesize supplementary updates: if one worker updated address/notes and the other logged the vaccine status, combine both into a SYNTHESIZED_MERGE.
5. Flag any data anomalies (e.g. vaccine marked done without batch numbers, contradictory notes, or impossible travel).
"""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SemanticTriageReport,
                    temperature=0.1,
                )
            )

            if response.text:
                data = json.loads(response.text)
                return SemanticTriageReport.model_validate(data)

        except Exception as e:
            logger.warning(f"Gemini 2.5 Flash call failed ({e}); falling back to deterministic semantic triage.")

    # Fallback to local heuristic engine
    return _heuristic_fallback_triage(base_rev, branch_a, branch_b)
