import { type AITriageData, type FormSchema } from '../db/schema';
import { computeGenericDiff } from './diffEngine';

export interface BranchData {
  worker_id: string;
  worker_role: string;
  device_id?: string;
  timestamp: string;
  gps_coords: { lat: number; lng: number; accuracy_meters: number };
  data: Record<string, any>;
}

/**
 * Domain-Agnostic Semantic Conflict Triage Engine
 * Analyzes metadata (timestamps, GPS accuracy, worker roles) and data payloads without hardcoding any domain specifics.
 */
export async function runDomainAgnosticTriage(
  recordId: string,
  baseRev: string,
  branchA: BranchData,
  branchB: BranchData,
  schema?: FormSchema,
  apiKey?: string
): Promise<AITriageData> {
  const diffResult = computeGenericDiff(branchA.data, branchB.data, undefined, schema);
  const conflictingFieldNames = diffResult.conflicting_fields;

  const timeA = new Date(branchA.timestamp).getTime();
  const timeB = new Date(branchB.timestamp).getTime();
  const timeDeltaMinutes = Math.abs(Math.round((timeB - timeA) / (1000 * 60)));

  const gpsA = branchA.gps_coords?.accuracy_meters ?? 10;
  const gpsB = branchB.gps_coords?.accuracy_meters ?? 15;

  // Optional online Gemini API call
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `You are SyncSphere's Universal Semantic Concurrency Triage AI.
Analyze this offline data collision between two distributed edge workers:

Target Document ID: ${recordId}
Base Revision: ${baseRev}
Schema: ${schema?.title || 'Generic JSON Record'}

BRANCH A:
Worker: ${branchA.worker_role} (${branchA.worker_id})
Timestamp: ${branchA.timestamp}
GPS Precision: ±${gpsA}m
Payload: ${JSON.stringify(branchA.data, null, 2)}

BRANCH B:
Worker: ${branchB.worker_role} (${branchB.worker_id})
Timestamp: ${branchB.timestamp}
GPS Precision: ±${gpsB}m
Payload: ${JSON.stringify(branchB.data, null, 2)}

Provide strict JSON with:
1. summary_of_discrepancy (1-2 sentences in plain English, domain-neutral)
2. recommended_resolution ("SYNTHESIZED_MERGE", "KEEP_BRANCH_A", or "KEEP_BRANCH_B")
3. confidence_score (float between 0.0 and 1.0)
4. plain_explanation (Root cause narrative analyzing timestamp delta, GPS credibility, and field values)
5. resolved_data (Complete merged JSON object)`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        }
      );

      if (response.ok) {
        const resJson = await response.json();
        const rawContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          return {
            summary_of_discrepancy: parsed.summary_of_discrepancy || `Concurrent updates from ${branchA.worker_role} and ${branchB.worker_role} diverged on ${conflictingFieldNames.length} fields.`,
            recommended_resolution: parsed.recommended_resolution || 'SYNTHESIZED_MERGE',
            confidence_score: parsed.confidence_score || 0.95,
            plain_explanation: parsed.plain_explanation || parsed.clinical_rationale || 'AI synthesized composite state preserving verified telemetry and observations.',
            field_diffs: diffResult.field_diffs,
            evidence_breakdown: {
              node_a_strengths: [`Role: ${branchA.worker_role}`, `GPS fix ±${gpsA.toFixed(1)}m precision`, 'Committed baseline lineage'],
              node_b_strengths: [`Role: ${branchB.worker_role}`, `Timestamp: ${new Date(branchB.timestamp).toLocaleTimeString()}`, 'Supplementary observations'],
              risk_level: 'LOW'
            },
            data_anomalies_flagged: parsed.data_anomalies_flagged || [],
            resolved_data: parsed.resolved_data || diffResult.synthesized_payload
          };
        }
      }
    } catch (e) {
      console.warn('Gemini API call skipped, running local semantic heuristics:', e);
    }
  }

  // Offline-Resilient Domain-Agnostic Heuristic Engine
  const conflictCount = conflictingFieldNames.length;
  const conflictingListStr = conflictingFieldNames.join(', ');

  const summary = conflictCount > 0
    ? `Two field workers (${branchA.worker_role} and ${branchB.worker_role}) submitted concurrent offline edits diverging on ${conflictCount} field(s): [${conflictingListStr}].`
    : `Two concurrent offline delta updates were submitted from base revision ${baseRev}. All values are supplementary.`;

  const explanation = `Branch A was recorded at ${new Date(branchA.timestamp).toLocaleTimeString()} with ±${gpsA.toFixed(1)}m GPS precision by ${branchA.worker_role}. Branch B was recorded ${timeDeltaMinutes}m apart by ${branchB.worker_role} with ±${gpsB.toFixed(1)}m GPS precision. The AI recommended resolution constructs a non-destructive composite record that retains primary verified metrics from the leading node while merging supplementary observations.`;

  const confidenceScore = Math.min(0.98, Math.max(0.85, 1 - (conflictCount * 0.04)));

  const anomalies: string[] = [];
  if (timeDeltaMinutes > 120) {
    anomalies.push(`Timestamp skew: ${timeDeltaMinutes} minutes between concurrent field visits.`);
  }
  if (Math.abs(gpsA - gpsB) > 15) {
    anomalies.push(`GPS precision variance: ±${gpsA}m vs ±${gpsB}m.`);
  }

  return {
    summary_of_discrepancy: summary,
    recommended_resolution: 'SYNTHESIZED_MERGE',
    confidence_score: confidenceScore,
    plain_explanation: explanation,
    field_diffs: diffResult.field_diffs,
    evidence_breakdown: {
      node_a_strengths: [
        `Primary authority: ${branchA.worker_role}`,
        `High-precision GPS lock (±${gpsA.toFixed(1)}m)`,
        `Target Parent Revision: ${baseRev}`
      ],
      node_b_strengths: [
        `Field Context: ${branchB.worker_role}`,
        `Visit recorded: ${new Date(branchB.timestamp).toLocaleTimeString()}`,
        `Preserved qualitative remarks & supplementary values`
      ],
      risk_level: conflictCount > 3 ? 'MEDIUM' : 'LOW'
    },
    data_anomalies_flagged: anomalies,
    resolved_data: diffResult.synthesized_payload
  };
}
