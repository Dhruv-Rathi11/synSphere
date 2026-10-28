import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PatientRecord, type OutboxMutation } from '../db/schema';
import {
  User,
  ShieldCheck,
  MapPin,
  Clock,
  Send,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Sparkles
} from 'lucide-react';

interface WorkerOption {
  id: string;
  name: string;
  role: string;
  description: string;
  defaultGps: { lat: number; lng: number; accuracy_meters: number };
}

const WORKER_PROFILES: WorkerOption[] = [
  {
    id: 'worker-a-anm',
    name: 'Worker A (ANM Nurse)',
    role: 'Auxiliary Nurse Midwife (ANM)',
    description: 'Clinical Field Administer • Rampur PHC Sub-Center',
    defaultGps: { lat: 28.6139, lng: 77.209, accuracy_meters: 3.2 }
  },
  {
    id: 'worker-b-surveyor',
    name: 'Worker B (Field Surveyor)',
    role: 'Community Field Surveyor',
    description: 'Relief & Demographics Volunteer • District Block 2',
    defaultGps: { lat: 28.6145, lng: 77.2104, accuracy_meters: 14.8 }
  }
];

export const FrontlineWorkerForm: React.FC = () => {
  // Live query for active record PAT-2026-01
  const patient = useLiveQuery<PatientRecord | undefined>(() =>
    db.patients.get('PAT-2026-01')
  );

  // Live query for pending outbox entries
  const outboxEntries = useLiveQuery<OutboxMutation[]>(() =>
    db.outbox.where({ record_id: 'PAT-2026-01' }).toArray()
  );

  // Form State
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(WORKER_PROFILES[0].id);
  const [vaccineStatus, setVaccineStatus] = useState<'Completed' | 'Pending'>('Completed');
  const [batchNo, setBatchNo] = useState<string>('COV-8902-IND');
  const [notes, setNotes] = useState<string>('Dose administered at village community center. Patient verified with Aadhaar.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSubmittedId, setLastSubmittedId] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const currentWorker = WORKER_PROFILES.find((w) => w.id === selectedWorkerId) || WORKER_PROFILES[0];

  const handleWorkerChange = (workerId: string) => {
    setSelectedWorkerId(workerId);
    if (workerId === 'worker-b-surveyor') {
      setVaccineStatus('Pending');
      setBatchNo('');
      setNotes('House visited at 10:15 AM. Patient was away in farm fields. Rescheduled for tomorrow.');
    } else {
      setVaccineStatus('Completed');
      setBatchNo('COV-8902-IND');
      setNotes('Dose administered at village community center. Patient verified with Aadhaar.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const timestamp = new Date().toISOString();
      const mutation: OutboxMutation = {
        record_id: patient.id,
        parent_rev: patient.rev, // Retains base revision hash
        worker_id: currentWorker.id,
        worker_role: currentWorker.role,
        timestamp,
        gps_coords: {
          ...currentWorker.defaultGps,
          // Add slight micro-jitter to simulate real GPS fix
          lat: currentWorker.defaultGps.lat + (Math.random() - 0.5) * 0.0002,
          lng: currentWorker.defaultGps.lng + (Math.random() - 0.5) * 0.0002
        },
        data: {
          vaccine_status: vaccineStatus,
          batch_no: vaccineStatus === 'Completed' ? batchNo : '',
          notes: notes.trim(),
          updated_at: timestamp
        },
        synced: false
      };

      // Append mutation to outbox without modifying patients table
      const id = await db.outbox.add(mutation);
      setLastSubmittedId(id);
      setFeedbackMessage(`Mutation buffered in Dexie Outbox! (Queue ID: #${id}, Parent Rev: ${patient.rev})`);

      // Auto-clear notification after 4 seconds
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 4500);
    } catch (err) {
      console.error('Failed to append mutation to outbox:', err);
      setFeedbackMessage('Failed to buffer mutation in local outbox.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Banner / Patient State Header */}
      <div className="glass-panel-elevated rounded-2xl p-5 border border-sky-500/20 bg-slate-900/80 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {patient?.name ?? 'Loading Patient...'}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                  {patient?.id ?? 'PAT-2026-01'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Age: <span className="text-slate-200 font-medium">{patient?.age ?? '--'} yrs</span> • Village: <span className="text-slate-200 font-medium">{patient?.village ?? '--'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Base Head Rev</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800/90 text-amber-400 border border-amber-500/30">
                <Database className="w-3.5 h-3.5" />
                {patient?.rev ?? '1-base00'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Local Status</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                  patient?.vaccine_status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {patient?.vaccine_status === 'Completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {patient?.vaccine_status ?? 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Informative Note */}
        <div className="pt-3.5 flex items-start gap-2.5 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200">Current Local Notes: </span>
            <span className="italic text-slate-300">"{patient?.notes || 'No baseline notes'}"</span>
          </div>
        </div>
      </div>

      {/* Main Frontline Input Form */}
      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-2xl p-6 border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Frontline Offline Mutation Input
            </h3>
            <p className="text-xs text-slate-400">
              Changes are isolated into IndexedDB outbox queue without overwriting baseline head.
            </p>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
            Offline-First Outbox
          </span>
        </div>

        {/* 1. Worker Identity Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <User className="w-4 h-4 text-sky-400" />
            1. Select Worker Identity (Frontline Session)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WORKER_PROFILES.map((worker) => {
              const isSelected = selectedWorkerId === worker.id;
              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => handleWorkerChange(worker.id)}
                  className={`p-4 rounded-xl text-left transition-all relative cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400/60 ring-2 ring-sky-400/20 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{worker.name}</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isSelected ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-600'
                      }`}
                    />
                  </div>
                  <p className="text-xs font-medium text-sky-300 mt-1">{worker.role}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{worker.description}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>GPS: {worker.defaultGps.lat.toFixed(4)}, {worker.defaultGps.lng.toFixed(4)} (±{worker.defaultGps.accuracy_meters}m)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Vaccine Status & Batch Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Vaccine Status Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              2. Vaccine Status
            </label>
            <select
              value={vaccineStatus}
              onChange={(e) => setVaccineStatus(e.target.value as 'Completed' | 'Pending')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
            >
              <option value="Completed">Completed (Dose Administered)</option>
              <option value="Pending">Pending (Not Administered / Follow-up)</option>
            </select>
          </div>

          {/* Batch Number */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              Batch / Lot Number
            </label>
            <input
              type="text"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder={vaccineStatus === 'Completed' ? 'e.g. COV-8902-IND' : 'N/A for Pending status'}
              disabled={vaccineStatus === 'Pending'}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-sm font-mono focus:outline-none transition-all ${
                vaccineStatus === 'Pending'
                  ? 'border-slate-800 text-slate-600 bg-slate-950/50 cursor-not-allowed'
                  : 'border-slate-700 text-white focus:ring-2 focus:ring-sky-400'
              }`}
            />
          </div>
        </div>

        {/* 3. Clinical Field Notes */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400" />
            3. Qualitative Field Notes & Context
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical observations, reasons for delay, next visit schedule, or witness details..."
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Telemetry Footer & Submit Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Target Parent Rev: <code className="text-amber-400 font-mono font-semibold">{patient?.rev ?? '1-base00'}</code></span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !patient}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Buffering Mutation...' : 'Queue Offline Mutation'}</span>
          </button>
        </div>

        {/* Success / Feedback Toast */}
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
        )}
      </form>

      {/* Outbox Queue Live Inspector */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-bold text-slate-200">
              Local Dexie Outbox Queue ({outboxEntries?.length ?? 0} Pending Mutations)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Storage: IndexedDB / SyncSphereDB
          </span>
        </div>

        {(!outboxEntries || outboxEntries.length === 0) ? (
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
            Outbox queue is currently empty. Submit a mutation above to buffer an offline edit.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {outboxEntries.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  item.id === lastSubmittedId
                    ? 'bg-sky-950/40 border-sky-500/40'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">
                      Queue #{item.id}
                    </span>
                    <span className="text-white">{item.worker_role}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Parent Rev: {item.parent_rev}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mt-1.5">
                  <div>
                    Status: <span className={item.data.vaccine_status === 'Completed' ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>{item.data.vaccine_status}</span>
                    {item.data.batch_no && (
                      <span className="ml-1 text-slate-500">({item.data.batch_no})</span>
                    )}
                  </div>
                  <div className="text-right text-slate-500">
                    GPS: {item.gps_coords.lat.toFixed(3)}, {item.gps_coords.lng.toFixed(3)}
                  </div>
                </div>

                <p className="mt-1 text-[11px] italic text-slate-300 line-clamp-1">
                  "{item.data.notes}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
