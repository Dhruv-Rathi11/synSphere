import Dexie, { type Table } from 'dexie';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'location' | 'textarea' | 'boolean';

export interface SchemaField {
  id: string;
  name: string; // key in record data object
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select fields
  defaultValue?: any;
  helpText?: string;
  unit?: string;
}

export interface FormSchema {
  id: string;
  title: string;
  description: string;
  version: string;
  icon: string;
  category: string;
  fields: SchemaField[];
  createdAt: string;
  updatedAt: string;
}

export interface GPSCoords {
  lat: number;
  lng: number;
  accuracy_meters: number;
}

export interface RecordMetadata {
  created_by_worker_id: string;
  created_by_worker_role: string;
  device_id: string;
  gps_coords?: GPSCoords;
  created_at: string;
  last_updated_at: string;
  last_updated_by_role: string;
}

export type SyncStatus = 'local' | 'synced' | 'conflict';

export interface GenericRecord {
  id: string;
  schema_id: string;
  rev: string;
  data: Record<string, any>;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  metadata: RecordMetadata;
}

export interface PatientRecord {
  id: string;
  rev: string;
  name: string;
  age: number;
  village: string;
  vaccine_status: 'Completed' | 'Pending';
  batch_no: string;
  notes: string;
  updated_at: string;
}

export interface OutboxMutation {
  id?: number;
  record_id: string;
  schema_id?: string;
  parent_rev: string;
  worker_id: string;
  worker_role: string;
  device_id?: string;
  timestamp: string;
  gps_coords: GPSCoords;
  data: Record<string, any>;
  synced: boolean;
}

export interface FieldDiffItem {
  field_name: string;
  field_label?: string;
  value_a: any;
  value_b: any;
  divergence_type: 'CONTRADICTORY' | 'SUPPLEMENTARY' | 'IDENTICAL';
  recommended_value: any;
}

export interface AITriageData {
  summary_of_discrepancy: string;
  recommended_resolution: 'KEEP_BRANCH_A' | 'KEEP_BRANCH_B' | 'SYNTHESIZED_MERGE' | 'MANUAL_AUDIT';
  confidence_score: number; // 0.0 to 1.0
  plain_explanation: string;
  field_diffs: FieldDiffItem[];
  evidence_breakdown?: {
    node_a_strengths: string[];
    node_b_strengths: string[];
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  data_anomalies_flagged?: string[];
  resolved_data?: Record<string, any>;
}

export interface ConflictLogItem {
  conflict_id: string;
  record_id: string;
  schema_id: string;
  base_rev: string;
  active_branch: {
    rev?: string;
    worker_id: string;
    worker_role: string;
    device_id?: string;
    timestamp: string;
    gps_coords: GPSCoords;
    data: Record<string, any>;
  };
  incoming_branch: {
    worker_id: string;
    worker_role: string;
    device_id?: string;
    timestamp: string;
    gps_coords: GPSCoords;
    data: Record<string, any>;
  };
  ai_triage: AITriageData | null;
  status: 'PENDING_REVIEW' | 'RESOLVED';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_decision?: string;
}

// Built-in Default Schemas
export const DEFAULT_SCHEMAS: FormSchema[] = [
  {
    id: 'rural_health',
    title: 'Rural Healthcare & Immunization',
    description: 'Track frontline immunization drives, vital signs, and cold-chain lot verifications.',
    version: '2.0',
    icon: 'Activity',
    category: 'Healthcare',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    fields: [
      { id: 'f1', name: 'patient_name', label: 'Patient Name', type: 'text', required: true, placeholder: 'Full legal name' },
      { id: 'f2', name: 'age', label: 'Age (Years)', type: 'number', required: true, placeholder: 'e.g. 24' },
      { id: 'f3', name: 'village', label: 'Village / Hamlet', type: 'text', required: true, placeholder: 'e.g. Rampur Sub-Center' },
      { id: 'f4', name: 'vaccine_status', label: 'Immunization Status', type: 'select', required: true, options: ['Completed', 'Pending', 'Contraindicated', 'Refused'], defaultValue: 'Completed' },
      { id: 'f5', name: 'batch_no', label: 'Vial Lot / Batch Number', type: 'text', placeholder: 'e.g. BCG-4401-AZ' },
      { id: 'f6', name: 'vital_signs', label: 'Clinical Vitals', type: 'text', placeholder: 'e.g. BP 120/80, Temp 98.4F' },
      { id: 'f7', name: 'field_notes', label: 'Field Notes & Clinical Context', type: 'textarea', placeholder: 'Enter household survey notes or clinical observations...' }
    ]
  },
  {
    id: 'disaster_relief',
    title: 'Disaster Relief & Ration Logistics',
    description: 'Emergency supply chain, water distribution, and flood zone shelter inventory.',
    version: '1.2',
    icon: 'Shield',
    category: 'Emergency Response',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    fields: [
      { id: 'd1', name: 'sector_quadrant', label: 'Sector / Evacuation Zone', type: 'text', required: true, placeholder: 'e.g. Sector 4-B (Flood Zone Delta)' },
      { id: 'd2', name: 'resource_type', label: 'Resource Category', type: 'select', required: true, options: ['Drinking Water (Crates)', 'MRE Rations (Boxes)', 'Medical Trauma Kits', 'Blankets & Tarpaulins'], defaultValue: 'Drinking Water (Crates)' },
      { id: 'd3', name: 'units_delivered', label: 'Units Delivered', type: 'number', required: true, placeholder: 'e.g. 450' },
      { id: 'd4', name: 'depot_status', label: 'Depot Operational State', type: 'select', required: true, options: ['Operational - Full Stock', 'Operational - Partial Stock', 'Critical Shortage', 'Stock Depleted'], defaultValue: 'Operational - Partial Stock' },
      { id: 'd5', name: 'hazard_level', label: 'Hazard & Flood Severity', type: 'select', options: ['Low Risk', 'Moderate Risk', 'High Flood Risk', 'Flash Flood Warning'], defaultValue: 'High Flood Risk' },
      { id: 'd6', name: 'field_notes', label: 'Logistics Notes & Route Telemetry', type: 'textarea', placeholder: 'Enter convoy access route, bridge status, or voucher numbers...' }
    ]
  },
  {
    id: 'grid_inspection',
    title: 'Remote Infrastructure & Grid Inspection',
    description: 'High-voltage substation diagnostics, thermal anomaly audits, and sensor logs.',
    version: '3.4',
    icon: 'Cpu',
    category: 'Utilities & Infrastructure',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    fields: [
      { id: 'g1', name: 'transformer_unit_id', label: 'Transformer / Asset Unit ID', type: 'text', required: true, placeholder: 'e.g. TX-SUB-882-EAST' },
      { id: 'g2', name: 'operational_integrity', label: 'Operational Integrity State', type: 'select', required: true, options: ['Nominal', 'Warning - Thermal Spike', 'Degraded', 'Critical Failure Imminent'], defaultValue: 'Nominal' },
      { id: 'g3', name: 'thermal_reading_celsius', label: 'Thermal Sensor Reading (°C)', type: 'number', required: true, placeholder: 'e.g. 86.4' },
      { id: 'g4', name: 'safety_hazard_flags', label: 'Safety Hazard Flags', type: 'text', placeholder: 'e.g. High Thermal Degrade (Coil 3)' },
      { id: 'g5', name: 'field_notes', label: 'Diagnostic Sensor Logs', type: 'textarea', placeholder: 'Enter physical contact pyrometer readings, acoustic sensor notes...' }
    ]
  },
  {
    id: 'ngo_survey',
    title: 'NGO Community Demographics Survey',
    description: 'Household water security, socioeconomic metrics, and vulnerability assessments.',
    version: '1.0',
    icon: 'Users',
    category: 'Demographics',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    fields: [
      { id: 'n1', name: 'household_head', label: 'Household Head Name', type: 'text', required: true, placeholder: 'e.g. Sunita Devi' },
      { id: 'n2', name: 'family_members', label: 'Family Member Count', type: 'number', required: true, placeholder: 'e.g. 5' },
      { id: 'n3', name: 'water_source_access', label: 'Primary Water Source Access', type: 'select', required: true, options: ['Piped Community Standpost', 'Borewell Handpump', 'Open Surface Well', 'Water Tanker'], defaultValue: 'Borewell Handpump' },
      { id: 'n4', name: 'food_security_status', label: 'Household Food Security', type: 'select', required: true, options: ['Secure (>3 meals/day)', 'Moderate Concern', 'Severe Insecurity'], defaultValue: 'Secure (>3 meals/day)' },
      { id: 'n5', name: 'survey_notes', label: 'Enumerator Survey Remarks', type: 'textarea', placeholder: 'Enter observations regarding housing structure, electricity, or sanitation...' }
    ]
  },
  {
    id: 'asset_audit',
    title: 'Field Equipment & Safety Compliance',
    description: 'Physical equipment verification, maintenance intervals, and safety certifications.',
    version: '1.5',
    icon: 'ClipboardCheck',
    category: 'Asset Management',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    fields: [
      { id: 'a1', name: 'asset_tag', label: 'Asset Barcode / Tag ID', type: 'text', required: true, placeholder: 'e.g. EQ-PUMP-9904' },
      { id: 'a2', name: 'facility_name', label: 'Facility / Depot Location', type: 'text', required: true, placeholder: 'e.g. Northern Depot Station' },
      { id: 'a3', name: 'compliance_status', label: 'Safety Compliance Status', type: 'select', required: true, options: ['Certified Compliant', 'Maintenance Required', 'Out of Service / Failed'], defaultValue: 'Certified Compliant' },
      { id: 'a4', name: 'inspection_grade', label: 'Inspection Grade (1-5)', type: 'number', placeholder: 'e.g. 4' },
      { id: 'a5', name: 'audit_notes', label: 'Inspector Findings & Remediation', type: 'textarea', placeholder: 'Log valve pressure, lubrication checks, calibration dates...' }
    ]
  }
];

// Baseline Records for Immediate Demo Experience
export const DEFAULT_BASELINE_RECORDS: GenericRecord[] = [
  {
    id: 'PAT-2026-01',
    schema_id: 'rural_health',
    rev: '1-base00',
    sync_status: 'synced',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
    metadata: {
      created_by_worker_id: 'worker-01',
      created_by_worker_role: 'Auxiliary Nurse Midwife (ANM)',
      device_id: 'DEV-TAB-4401',
      gps_coords: { lat: 28.6139, lng: 77.209, accuracy_meters: 3.2 },
      created_at: '2026-09-01T08:00:00Z',
      last_updated_at: '2026-09-01T08:00:00Z',
      last_updated_by_role: 'Auxiliary Nurse Midwife (ANM)'
    },
    data: {
      patient_name: 'Ravi Kumar',
      age: 24,
      village: 'Rampur Sub-Center',
      vaccine_status: 'Pending',
      batch_no: '',
      vital_signs: 'Normal (BP 120/80)',
      field_notes: 'Baseline household survey registered by village health worker.'
    }
  },
  {
    id: 'DOC-RELIEF-409',
    schema_id: 'disaster_relief',
    rev: '1-base00',
    sync_status: 'synced',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
    metadata: {
      created_by_worker_id: 'convoy-lead-01',
      created_by_worker_role: 'Ground Convoy Lead',
      device_id: 'DEV-RUG-9021',
      gps_coords: { lat: 25.5941, lng: 85.1376, accuracy_meters: 4.0 },
      created_at: '2026-09-01T08:00:00Z',
      last_updated_at: '2026-09-01T08:00:00Z',
      last_updated_by_role: 'Disaster Response Team 1'
    },
    data: {
      sector_quadrant: 'Sector 4-B (Flood Zone Delta)',
      resource_type: 'Drinking Water (Crates)',
      units_delivered: 0,
      depot_status: 'Stock Depleted',
      hazard_level: 'High Flood Risk',
      field_notes: 'Initial emergency evacuation shelter depot established.'
    }
  },
  {
    id: 'GRID-UNIT-882',
    schema_id: 'grid_inspection',
    rev: '1-base00',
    sync_status: 'synced',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
    metadata: {
      created_by_worker_id: 'line-engineer-01',
      created_by_worker_role: 'Senior Line Engineer',
      device_id: 'DEV-DRONE-88',
      gps_coords: { lat: 19.076, lng: 72.8777, accuracy_meters: 2.5 },
      created_at: '2026-09-01T08:00:00Z',
      last_updated_at: '2026-09-01T08:00:00Z',
      last_updated_by_role: 'Substation Diagnostic Specialist'
    },
    data: {
      transformer_unit_id: 'TX-SUB-882-EAST',
      operational_integrity: 'Nominal',
      thermal_reading_celsius: 42.5,
      safety_hazard_flags: 'None (Safe Operating Range)',
      field_notes: 'Quarterly baseline telemetry check completed.'
    }
  }
];

export class SyncSphereDatabase extends Dexie {
  schemas!: Table<FormSchema, string>;
  records!: Table<GenericRecord, string>;
  outbox!: Table<OutboxMutation, number>;
  conflicts!: Table<ConflictLogItem, string>;
  patients!: Table<any, string>;

  constructor() {
    super('SyncSphereDB');
    this.version(2).stores({
      schemas: 'id, title, category, version, updatedAt',
      records: 'id, schema_id, rev, sync_status, updated_at',
      outbox: '++id, record_id, schema_id, parent_rev, worker_id, timestamp, synced',
      conflicts: 'conflict_id, record_id, schema_id, base_rev, status, created_at',
      patients: 'id, rev, name, village, vaccine_status, updated_at'
    });

    this.on('populate', async () => {
      await this.schemas.bulkAdd(DEFAULT_SCHEMAS);
      await this.records.bulkAdd(DEFAULT_BASELINE_RECORDS);
    });
  }
}

export const db = new SyncSphereDatabase();

// Safety hook to guarantee schema and baseline record population across environments
db.on('ready', async () => {
  try {
    const schemaCount = await db.schemas.count();
    if (schemaCount === 0) {
      await db.schemas.bulkAdd(DEFAULT_SCHEMAS);
    }

    const recordCount = await db.records.count();
    if (recordCount === 0) {
      await db.records.bulkAdd(DEFAULT_BASELINE_RECORDS);
    }
  } catch (e) {
    console.warn('SyncSphere DB ready hook initialization:', e);
  }
});
