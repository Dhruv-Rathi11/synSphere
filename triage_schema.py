from typing import Literal, List
from pydantic import BaseModel, Field


class FieldLevelDiff(BaseModel):
    field_name: str = Field(..., description="Name of the conflicting or merged field")
    value_a: str = Field(..., description="Value recorded in Branch A")
    value_b: str = Field(..., description="Value recorded in Branch B")
    divergence_type: Literal["CONTRADICTORY", "SUPPLEMENTARY", "IDENTICAL"] = Field(
        ..., description="Type of divergence between the two worker branches"
    )
    recommended_value: str = Field(..., description="The recommended resolved/merged value")


class SemanticTriageReport(BaseModel):
    summary_of_discrepancy: str = Field(
        ..., description="1-sentence plain-language summary of what happened"
    )
    recommended_resolution: Literal["KEEP_BRANCH_A", "KEEP_BRANCH_B", "SYNTHESIZED_MERGE"] = Field(
        ..., description="High-level recommended resolution action"
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="AI confidence score between 0.0 and 1.0"
    )
    clinical_rationale: str = Field(
        ..., description="Explicit explanation analyzing worker credentials, GPS data, timestamps, and medical details"
    )
    field_diffs: List[FieldLevelDiff] = Field(
        ..., description="Field-by-field breakdown of differences and recommendations"
    )
    data_anomalies_flagged: List[str] = Field(
        default_factory=list,
        description="Contextual red flags (e.g. vaccine marked done before birthdate, missing batch numbers, impossible travel)"
    )
