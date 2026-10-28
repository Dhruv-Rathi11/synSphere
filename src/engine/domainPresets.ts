export type DomainId = 'rural_health' | 'disaster_relief' | 'grid_inspection';

export interface NodeProfile {
  id: string;
  name: string;
  role: string;
  badge: string;
  defaultGps: { lat: number; lng: number; accuracy_meters: number };
  samplePayload: Record<string, any>;
}

export interface DomainPreset {
  id: DomainId;
  name: string;
  shortTag: string;
  icon: string;
  schemaVersion: string;
  documentId: string;
  description: string;
  baselineDocument: {
    id: string;
    rev: string;
    data: Record<string, any>;
  };
  nodeAlpha: NodeProfile;
  nodeBeta: NodeProfile;
  keyAttributes: {
    key: string;
    label: string;
    type: 'string' | 'number' | 'status' | 'code';
  }[];
}

export const DOMAIN_PRESETS: Record<DomainId, DomainPreset> = {
  rural_health: {
    id: 'rural_health',
    name: 'Rural Healthcare (Immunization Drive)',
    shortTag: 'HealthTelemetry',
    icon: 'Activity',
    schemaVersion: 'HealthTelemetry.Immunization_v2.0',
    documentId: 'PAT-2026-01',
    description: 'Frontline rural immunization tracking, cold-chain proofs, and door-to-door followups.',
    baselineDocument: {
      id: 'PAT-2026-01',
      rev: '1-base00',
      data: {
        patient_name: 'Ravi Kumar',
        age: 24,
        village: 'Rampur Sub-Center',
        vaccine_status: 'Pending',
        batch_no: '',
        vital_signs: 'Normal (BP 120/80)',
        field_notes: 'Baseline household survey registered by village worker.'
      }
    },
    nodeAlpha: {
      id: 'node-alpha-health',
      name: 'Node Alpha (ANM Nurse Lead)',
      role: 'Auxiliary Nurse Midwife (Clinical Authority)',
      badge: 'Clinician Lead (±3.2m GPS)',
      defaultGps: { lat: 28.6139, lng: 77.209, accuracy_meters: 3.2 },
      samplePayload: {
        vaccine_status: 'Completed',
        batch_no: 'BCG-4401-AZ',
        vital_signs: 'BP 120/80, Temp 98.4F',
        field_notes: 'Dose administered at village community center. Verified physical cold-chain lot barcode #BCG-4401.'
      }
    },
    nodeBeta: {
      id: 'node-beta-health',
      name: 'Node Beta (Field Surveyor)',
      role: 'Community Demographics Field Agent',
      badge: 'Surveyor (±14.8m GPS)',
      defaultGps: { lat: 28.6145, lng: 77.2104, accuracy_meters: 14.8 },
      samplePayload: {
        vaccine_status: 'Pending',
        batch_no: '',
        vital_signs: 'Unassessed',
        field_notes: 'House visited 15m later; patient reported away in farm fields. Relatives confirmed residency; rescheduled follow-up.'
      }
    },
    keyAttributes: [
      { key: 'vaccine_status', label: 'Immunization Status', type: 'status' },
      { key: 'batch_no', label: 'Vial Lot Number', type: 'code' },
      { key: 'vital_signs', label: 'Clinical Vitals', type: 'string' },
      { key: 'field_notes', label: 'Qualitative Field Notes', type: 'string' }
    ]
  },

  disaster_relief: {
    id: 'disaster_relief',
    name: 'Disaster Relief (Ration Logistics)',
    shortTag: 'EmergencyLogistics',
    icon: 'Shield',
    schemaVersion: 'EmergencyRelief.SupplyLedger_v1.2',
    documentId: 'DOC-RELIEF-409',
    description: 'Emergency supply chain, water delivery, and shelter depot inventory across flood zones.',
    baselineDocument: {
      id: 'DOC-RELIEF-409',
      rev: '1-base00',
      data: {
        sector_quadrant: 'Sector 4-B (Flood Zone Delta)',
        resource_type: 'Drinking Water (Crates)',
        units_delivered: 0,
        depot_status: 'Stock Depleted',
        hazard_level: 'High Flood Risk',
        field_notes: 'Initial emergency evacuation shelter depot established.'
      }
    },
    nodeAlpha: {
      id: 'node-alpha-relief',
      name: 'Node Alpha (Ground Convoy Lead)',
      role: 'Disaster Rapid Response Team 1',
      badge: 'Depot Unit (±4.0m GPS)',
      defaultGps: { lat: 25.5941, lng: 85.1376, accuracy_meters: 4.0 },
      samplePayload: {
        resource_type: 'Drinking Water (Crates)',
        units_delivered: 450,
        depot_status: 'Operational - Partial Stock',
        field_notes: 'Delivered 450 crates via amphibious cargo carrier. Stock receipt voucher #WH-992 signed by shelter manager.'
      }
    },
    nodeBeta: {
      id: 'node-beta-relief',
      name: 'Node Beta (Helicopter Air-Drop Unit)',
      role: 'Aviation Emergency Relief Team 2',
      badge: 'Air Unit (±22.0m GPS)',
      defaultGps: { lat: 25.5962, lng: 85.1412, accuracy_meters: 22.0 },
      samplePayload: {
        resource_type: 'Drinking Water & MRE Rations',
        units_delivered: 150,
        depot_status: 'Critical Shortage',
        field_notes: 'Main access bridge washed out at Sector 4 pass. Completed emergency air-drop of 150 units on eastern landing zone.'
      }
    },
    keyAttributes: [
      { key: 'depot_status', label: 'Depot Operational State', type: 'status' },
      { key: 'units_delivered', label: 'Units Delivered', type: 'number' },
      { key: 'resource_type', label: 'Resource Category', type: 'code' },
      { key: 'field_notes', label: 'Field Telemetry & Route Notes', type: 'string' }
    ]
  },

  grid_inspection: {
    id: 'grid_inspection',
    name: 'Remote Infrastructure (Grid Telemetry)',
    shortTag: 'IndustrialGrid',
    icon: 'Cpu',
    schemaVersion: 'IndustrialIoT.GridTelemetry_v3.4',
    documentId: 'GRID-UNIT-882',
    description: 'High-voltage substation diagnostics, thermal anomaly audits, and autonomous drone passes.',
    baselineDocument: {
      id: 'GRID-UNIT-882',
      rev: '1-base00',
      data: {
        transformer_unit_id: 'TX-SUB-882-EAST',
        operational_integrity: 'Nominal',
        thermal_reading_celsius: 42.5,
        safety_hazard_flags: 'None (Safe Operating Range)',
        field_notes: 'Quarterly baseline telemetry check completed.'
      }
    },
    nodeAlpha: {
      id: 'node-alpha-grid',
      name: 'Node Alpha (Senior Line Engineer)',
      role: 'Substation Diagnostic Specialist',
      badge: 'Engineer (±2.5m GPS)',
      defaultGps: { lat: 19.076, lng: 72.8777, accuracy_meters: 2.5 },
      samplePayload: {
        operational_integrity: 'Warning - Thermal Spike',
        thermal_reading_celsius: 86.4,
        safety_hazard_flags: 'High Thermal Degrade (Coil 3)',
        field_notes: 'Physical contact pyrometer inspection: Core temperature at 86.4°C under 120% surge load. Recommend load shed.'
      }
    },
    nodeBeta: {
      id: 'node-beta-grid',
      name: 'Node Beta (Autonomous LiDAR Drone)',
      role: 'Autonomous Aerial Telemetry Node',
      badge: 'LiDAR Drone (±8.0m GPS)',
      defaultGps: { lat: 19.0782, lng: 72.8795, accuracy_meters: 8.0 },
      samplePayload: {
        operational_integrity: 'Degraded',
        thermal_reading_celsius: 81.0,
        safety_hazard_flags: 'Harmonic Vibration Anomaly',
        field_notes: 'Aerial infrared scan confirmed hot spots on primary bushings; ultrasonic sensor recorded 120Hz mechanical resonance.'
      }
    },
    keyAttributes: [
      { key: 'operational_integrity', label: 'Operational Integrity', type: 'status' },
      { key: 'thermal_reading_celsius', label: 'Thermal Sensor (°C)', type: 'number' },
      { key: 'safety_hazard_flags', label: 'Safety Hazard Flags', type: 'code' },
      { key: 'field_notes', label: 'Diagnostic Sensor Logs', type: 'string' }
    ]
  }
};
