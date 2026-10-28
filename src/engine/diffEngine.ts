import { type FieldDiffItem, type FormSchema } from '../db/schema';

export interface ComprehensiveDiffResult {
  conflicting_fields: string[];
  field_diffs: FieldDiffItem[];
  has_conflicts: boolean;
  total_divergences: number;
  synthesized_payload: Record<string, any>;
}

function areValuesEqual(valA: any, valB: any): boolean {
  if (valA === valB) return true;
  if (valA === undefined && valB === '') return true;
  if (valB === undefined && valA === '') return true;
  if (valA === null && valB === undefined) return true;
  if (valB === null && valA === undefined) return true;

  if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
    try {
      return JSON.stringify(valA) === JSON.stringify(valB);
    } catch {
      return false;
    }
  }

  // Case-insensitive string comparison if trimmed
  if (typeof valA === 'string' && typeof valB === 'string') {
    return valA.trim() === valB.trim();
  }

  return false;
}

function isEmptyValue(val: any): boolean {
  return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
}

export function formatFieldValue(val: any): string {
  if (val === undefined || val === null || val === '') {
    return '— (Empty)';
  }
  if (typeof val === 'boolean') {
    return val ? 'Yes / True' : 'No / False';
  }
  if (typeof val === 'object') {
    if (val.lat !== undefined && val.lng !== undefined) {
      return `${val.lat.toFixed(4)}, ${val.lng.toFixed(4)}${val.accuracy_meters ? ` (±${val.accuracy_meters}m)` : ''}`;
    }
    return JSON.stringify(val);
  }
  return String(val);
}

export function computeGenericDiff(
  dataA: Record<string, any>,
  dataB: Record<string, any>,
  _baseData?: Record<string, any>,
  schema?: FormSchema
): ComprehensiveDiffResult {
  const allKeys = Array.from(
    new Set([
      ...Object.keys(dataA || {}),
      ...Object.keys(dataB || {}),
      ...(schema ? schema.fields.map((f) => f.name) : [])
    ])
  ).filter((key) => !['updated_at', 'created_at', 'id', 'rev'].includes(key));

  const fieldDiffs: FieldDiffItem[] = [];
  const conflictingFields: string[] = [];
  const synthesizedPayload: Record<string, any> = {};

  for (const key of allKeys) {
    const valA = dataA?.[key];
    const valB = dataB?.[key];

    const schemaField = schema?.fields.find((f) => f.name === key);
    const fieldLabel = schemaField?.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const isIdentical = areValuesEqual(valA, valB);
    const isAEmpty = isEmptyValue(valA);
    const isBEmpty = isEmptyValue(valB);

    let divergenceType: 'IDENTICAL' | 'SUPPLEMENTARY' | 'CONTRADICTORY';
    let recommendedValue: any;

    if (isIdentical) {
      divergenceType = 'IDENTICAL';
      recommendedValue = valA !== undefined ? valA : valB;
    } else if (isAEmpty && !isBEmpty) {
      divergenceType = 'SUPPLEMENTARY';
      recommendedValue = valB;
    } else if (!isAEmpty && isBEmpty) {
      divergenceType = 'SUPPLEMENTARY';
      recommendedValue = valA;
    } else {
      // Both have non-empty different values
      divergenceType = 'CONTRADICTORY';
      conflictingFields.push(key);

      // Heuristic resolution:
      // If strings/notes, concatenate supplementary context non-destructively
      if (typeof valA === 'string' && typeof valB === 'string' && (key.includes('notes') || key.includes('remarks') || key.includes('log') || key.includes('flags'))) {
        recommendedValue = `[Node A]: ${valA} | [Node B]: ${valB}`;
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        // Higher value or latest verified
        recommendedValue = Math.max(valA, valB);
      } else {
        // Operational priority to Node A by default, preserved in composite
        recommendedValue = valA;
      }
    }

    synthesizedPayload[key] = recommendedValue;

    fieldDiffs.push({
      field_name: key,
      field_label: fieldLabel,
      value_a: valA,
      value_b: valB,
      divergence_type: divergenceType,
      recommended_value: recommendedValue
    });
  }

  return {
    conflicting_fields: conflictingFields,
    field_diffs: fieldDiffs,
    has_conflicts: conflictingFields.length > 0,
    total_divergences: fieldDiffs.filter((d) => d.divergence_type !== 'IDENTICAL').length,
    synthesized_payload: synthesizedPayload
  };
}
