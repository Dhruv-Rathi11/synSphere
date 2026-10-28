import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FormSchema, type OutboxMutation, DEFAULT_SCHEMAS } from '../db/schema';
import { queueRecordMutation } from '../engine/syncEngine';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Layers,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DualWorkerSimulation: React.FC<{ onNavigateToTriage: () => void }> = ({
  onNavigateToTriage
}) => {
  const schemas = useLiveQuery<FormSchema[]>(() => db.schemas.toArray()) ?? DEFAULT_SCHEMAS;
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('rural_health');
  const activeSchema = schemas.find((s) => s.id === selectedSchemaId) || schemas[0] || DEFAULT_SCHEMAS[0];

  const targetDocId = `${activeSchema.id.toUpperCase()}-001`;

  // Live queries
  const outbox = useLiveQuery<OutboxMutation[]>(() =>
    db.outbox.where({ record_id: targetDocId }).toArray()
  , [targetDocId]);

  // Node Alpha & Beta Payloads
  const [payloadA, setPayloadA] = useState<Record<string, any>>({});
  const [payloadB, setPayloadB] = useState<Record<string, any>>({});
  const [isTriggering, setIsTriggering] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Initialize sample divergent payloads for active schema
  useEffect(() => {
    if (activeSchema.id === 'rural_health') {
      setPayloadA({
        patient_name: 'Ravi Kumar',
        age: 24,
        village: 'Rampur Sub-Center',
        vaccine_status: 'Completed',
        batch_no: 'BCG-4401-AZ',
        vital_signs: 'BP 120/80, Temp 98.4F',
        field_notes: 'Dose administered at village community center. Verified physical cold-chain lot barcode #BCG-4401.'
      });
      setPayloadB({
        patient_name: 'Ravi Kumar',
        age: 24,
        village: 'Rampur Sub-Center',
        vaccine_status: 'Pending',
        batch_no: '',
        vital_signs: 'Unassessed',
        field_notes: 'House visited 15m later; patient reported away in farm fields. Rescheduled follow-up.'
      });
    } else if (activeSchema.id === 'disaster_relief') {
      setPayloadA({
        sector_quadrant: 'Sector 4-B (Flood Zone Delta)',
        resource_type: 'Drinking Water (Crates)',
        units_delivered: 450,
        depot_status: 'Operational - Partial Stock',
        hazard_level: 'High Flood Risk',
        field_notes: 'Delivered 450 crates via amphibious cargo carrier. Voucher #WH-992 signed by depot manager.'
      });
      setPayloadB({
        sector_quadrant: 'Sector 4-B (Flood Zone Delta)',
        resource_type: 'Drinking Water (Crates)',
        units_delivered: 150,
        depot_status: 'Critical Shortage',
        hazard_level: 'High Flood Risk',
        field_notes: 'Main access bridge washed out. Emergency air-drop of 150 crates on eastern sector pass.'
      });
    } else if (activeSchema.id === 'grid_inspection') {
      setPayloadA({
        transformer_unit_id: 'TX-SUB-882-EAST',
        operational_integrity: 'Warning - Thermal Spike',
        thermal_reading_celsius: 86.4,
        safety_hazard_flags: 'High Thermal Degrade (Coil 3)',
        field_notes: 'Physical pyrometer reading at 86.4°C under 120% surge load. Recommend load shed.'
      });
      setPayloadB({
        transformer_unit_id: 'TX-SUB-882-EAST',
        operational_integrity: 'Degraded',
        thermal_reading_celsius: 81.0,
        safety_hazard_flags: 'Harmonic Vibration Anomaly',
        field_notes: 'LiDAR aerial scan confirmed hot spots on primary bushings; recorded 120Hz resonance.'
      });
    } else {
      // Generic fallback
      const sampleA: Record<string, any> = {};
      const sampleB: Record<string, any> = {};
      activeSchema.fields.forEach((f) => {
        if (f.type === 'number') {
          sampleA[f.name] = 100;
          sampleB[f.name] = 50;
        } else if (f.type === 'select' && f.options && f.options.length > 1) {
          sampleA[f.name] = f.options[0];
          sampleB[f.name] = f.options[1];
        } else {
          sampleA[f.name] = `Node Alpha recorded ${f.label}`;
          sampleB[f.name] = `Node Beta observed ${f.label}`;
        }
      });
      setPayloadA(sampleA);
      setPayloadB(sampleB);
    }
  }, [activeSchema]);

  const handleTriggerPartitionCollision = async () => {
    setIsTriggering(true);
    setToastMsg(null);

    const baseRev = '1-base00';

    try {
      // Queue Worker Alpha Mutation
      await queueRecordMutation({
        record_id: targetDocId,
        schema_id: activeSchema.id,
        parent_rev: baseRev,
        worker_id: 'worker-node-alpha',
        worker_role: 'Node Alpha (Lead Authority)',
        device_id: 'DEV-RUG-ALPHA',
        gps_coords: { lat: 28.6139, lng: 77.2090, accuracy_meters: 3.2 },
        data: payloadA
      });

      // Queue Worker Beta Mutation
      await queueRecordMutation({
        record_id: targetDocId,
        schema_id: activeSchema.id,
        parent_rev: baseRev,
        worker_id: 'worker-node-beta',
        worker_role: 'Node Beta (Mobile Surveyor)',
        device_id: 'DEV-TAB-BETA',
        gps_coords: { lat: 28.6145, lng: 77.2104, accuracy_meters: 14.8 },
        data: payloadB
      });

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setToastMsg(`Partition collision staged! 2 divergent branches queued for ${targetDocId}.`);
    } catch (e) {
      console.error('Failed to trigger partition collision:', e);
      setToastMsg('Error staging collision.');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleResetSimulator = async () => {
    await db.outbox.where({ record_id: targetDocId }).delete();
    await db.conflicts.where({ record_id: targetDocId }).delete();
    await db.records.put({
      id: targetDocId,
      schema_id: activeSchema.id,
      rev: '1-base00',
      data: payloadA,
      sync_status: 'synced',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        created_by_worker_id: 'system',
        created_by_worker_role: 'Baseline Seeder',
        device_id: 'DEV-INIT',
        gps_coords: { lat: 28.6139, lng: 77.2090, accuracy_meters: 5.0 },
        created_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        last_updated_by_role: 'System'
      }
    });
    setToastMsg(`Simulator state reset for ${targetDocId}.`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-mono">
      {/* Top Automation Bar */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-sky-500/25 bg-slate-900/90 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Distributed Network Partition Simulator
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  MVCC Concurrency Sandbox
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Simulate two edge workers operating in separate zero-connectivity areas modifying the same record offline from base rev <code className="text-amber-400 font-bold">1-base00</code>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleTriggerPartitionCollision}
              disabled={isTriggering}
              className="px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isTriggering ? 'Staging...' : 'Trigger Partition Collision'}</span>
            </button>

            <button
              onClick={handleResetSimulator}
              className="px-3.5 py-2.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 cursor-pointer"
            >
              Reset State
            </button>
          </div>
        </div>

        {/* Schema Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Select Simulation Schema:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {schemas.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSchemaId(s.id)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSchemaId === s.id
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {s.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {toastMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Worker Node Emulators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node Alpha */}
        <div className="glass-panel rounded-3xl p-6 border border-sky-500/30 bg-slate-900/90 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm">
                α
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Node Alpha (Field Lead)</h4>
                <p className="text-[10px] text-sky-300">Authority Role • GPS ±3.2m Lock</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30">
              OFFLINE (ISOLATED)
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="text-[10px] text-slate-400 uppercase font-bold block">
              Node Alpha State Payload:
            </label>
            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-sky-300 overflow-x-auto leading-relaxed max-h-48">
              {JSON.stringify(payloadA, null, 2)}
            </pre>
          </div>
        </div>

        {/* Node Beta */}
        <div className="glass-panel rounded-3xl p-6 border border-purple-500/30 bg-slate-900/90 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
                β
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Node Beta (Mobile Surveyor)</h4>
                <p className="text-[10px] text-purple-300">Context Provider • GPS ±14.8m Lock</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30">
              OFFLINE (ISOLATED)
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="text-[10px] text-slate-400 uppercase font-bold block">
              Node Beta State Payload:
            </label>
            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-purple-300 overflow-x-auto leading-relaxed max-h-48">
              {JSON.stringify(payloadB, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Collision Alert Bar */}
      {outbox && outbox.length >= 2 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-950/70 via-indigo-950/70 to-purple-950/70 border border-sky-400/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <div>
              <h4 className="font-bold text-sm text-white">
                2 Divergent MVCC Mutations Staged in Local Outbox for {targetDocId}
              </h4>
              <p className="text-xs text-slate-300 font-sans">
                Both mutations branch concurrently from base rev <code className="text-amber-400 font-bold">1-base00</code>. View in Conflict Inbox to run AI triage & resolve.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToTriage}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-lg shadow-sky-400/25 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-all"
          >
            <span>Open Conflict Inbox</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
