import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FormSchema, type GenericRecord, type GPSCoords } from '../db/schema';
import { queueRecordMutation } from '../engine/syncEngine';
import { MetadataStrip } from './MetadataStrip';
import { RecordStatusBadge } from './RecordStatusBadge';
import { useTranslation } from '../i18n';
import {
  Send,
  CheckCircle2,
  Sparkles,
  Layers,
  MapPin,
  RefreshCw,
  Clock,
  User,
  Activity,
  Shield,
  Cpu,
  Users,
  ClipboardCheck,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WorkerProfile {
  id: string;
  name: string;
  role: string;
  deviceId: string;
  defaultGps: GPSCoords;
}

const DEFAULT_WORKERS: WorkerProfile[] = [
  {
    id: 'worker-lead-alpha',
    name: 'Field Lead (Node Alpha)',
    role: 'Primary Field Lead / Clinical Specialist',
    deviceId: 'DEV-RUG-9021',
    defaultGps: { lat: 28.6139, lng: 77.2090, accuracy_meters: 3.2 }
  },
  {
    id: 'worker-surveyor-beta',
    name: 'Surveyor / Mobile Unit (Node Beta)',
    role: 'Community Demographics & Mobile Surveyor',
    deviceId: 'DEV-TAB-4401',
    defaultGps: { lat: 28.6145, lng: 77.2104, accuracy_meters: 14.8 }
  }
];

export interface DynamicFormRendererProps {
  schema: FormSchema;
  onRecordSaved?: (recordId: string) => void;
  targetRecordId?: string;
  className?: string;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  schema,
  onRecordSaved,
  targetRecordId,
  className = ''
}) => {
  const { t } = useTranslation();

  // Active worker identity
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(DEFAULT_WORKERS[0].id);
  const currentWorker = DEFAULT_WORKERS.find((w) => w.id === selectedWorkerId) || DEFAULT_WORKERS[0];

  // Target record state (if editing or targeting existing record)
  const [recordIdInput, setRecordIdInput] = useState<string>(targetRecordId || `${schema.id.toUpperCase()}-001`);
  
  // Dynamic form field values
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Live query for target record in IndexedDB
  const activeRecord = useLiveQuery<GenericRecord | undefined>(() =>
    db.records.get(recordIdInput)
  , [recordIdInput]);

  // Sync schema default values when schema changes
  useEffect(() => {
    const initial: Record<string, any> = {};
    for (const field of schema.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue;
      } else if (field.type === 'select' && field.options && field.options.length > 0) {
        initial[field.name] = field.options[0];
      } else if (field.type === 'number') {
        initial[field.name] = '';
      } else if (field.type === 'boolean') {
        initial[field.name] = false;
      } else {
        initial[field.name] = '';
      }
    }

    // If an active record exists, prepopulate with its data
    if (activeRecord?.data) {
      setFormData({ ...initial, ...activeRecord.data });
    } else {
      setFormData(initial);
    }
  }, [schema, activeRecord]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSetGpsLocation = (name: string) => {
    const lat = currentWorker.defaultGps.lat + (Math.random() - 0.5) * 0.0004;
    const lng = currentWorker.defaultGps.lng + (Math.random() - 0.5) * 0.0004;
    handleFieldChange(name, {
      lat,
      lng,
      accuracy_meters: currentWorker.defaultGps.accuracy_meters
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of schema.fields) {
      if (field.required) {
        const val = formData[field.name];
        if (val === undefined || val === null || val === '') {
          errors[field.name] = `${field.label} is required`;
        }
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFeedbackToast(null);

    try {
      const parentRev = activeRecord?.rev || '1-base00';
      const gpsWithJitter: GPSCoords = {
        lat: currentWorker.defaultGps.lat + (Math.random() - 0.5) * 0.0002,
        lng: currentWorker.defaultGps.lng + (Math.random() - 0.5) * 0.0002,
        accuracy_meters: currentWorker.defaultGps.accuracy_meters
      };

      const queueId = await queueRecordMutation({
        record_id: recordIdInput.trim(),
        schema_id: schema.id,
        parent_rev: parentRev,
        worker_id: currentWorker.id,
        worker_role: currentWorker.role,
        device_id: currentWorker.deviceId,
        gps_coords: gpsWithJitter,
        data: formData
      });

      // Also ensure a local record entry exists with local status
      const existing = await db.records.get(recordIdInput.trim());
      const now = new Date().toISOString();
      if (!existing) {
        await db.records.put({
          id: recordIdInput.trim(),
          schema_id: schema.id,
          rev: parentRev,
          data: formData,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
          metadata: {
            created_by_worker_id: currentWorker.id,
            created_by_worker_role: currentWorker.role,
            device_id: currentWorker.deviceId,
            gps_coords: gpsWithJitter,
            created_at: now,
            last_updated_at: now,
            last_updated_by_role: currentWorker.role
          }
        });
      }

      setFeedbackToast(
        `Mutation queued in IndexedDB outbox! [Queue #${queueId} | Target Rev: ${parentRev}]`
      );

      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });

      if (onRecordSaved) {
        onRecordSaved(recordIdInput.trim());
      }

      setTimeout(() => {
        setFeedbackToast(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to queue offline record:', err);
      setFeedbackToast('Failed to buffer mutation in local IndexedDB.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSchemaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Activity':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-sky-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      case 'Users':
        return <Users className="w-5 h-5 text-amber-400" />;
      case 'ClipboardCheck':
        return <ClipboardCheck className="w-5 h-5 text-indigo-400" />;
      default:
        return <FileText className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Schema Header & Active Record State Card */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-sky-500/20 bg-slate-900/90 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-sky-400/30 flex items-center justify-center shadow-md">
              {getSchemaIcon(schema.icon)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">{schema.title}</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  v{schema.version}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  {schema.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{schema.description}</p>
            </div>
          </div>

          {/* Record Sync Badge if existing */}
          {activeRecord && (
            <div className="flex flex-col sm:items-end gap-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400">Record State</span>
              <RecordStatusBadge status={activeRecord.sync_status} rev={activeRecord.rev} />
            </div>
          )}
        </div>

        {/* Worker Session & Target Record Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-mono">
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Frontline Worker Profile
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-sky-400 outline-none"
            >
              {DEFAULT_WORKERS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Target Record / Document ID
            </label>
            <input
              type="text"
              value={recordIdInput}
              onChange={(e) => setRecordIdInput(e.target.value)}
              placeholder="e.g. PAT-2026-01"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sky-300 focus:ring-2 focus:ring-sky-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Dynamic Schema Form */}
      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-3xl p-6 sm:p-7 border border-slate-800 bg-slate-900/90 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              {t('form.newEntry')} — {schema.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Schema-driven dynamic inputs. Buffered locally in IndexedDB without blocking on network.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
            {schema.fields.length} Field{schema.fields.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Dynamic Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {schema.fields.map((field) => {
            const isFullWidth = field.type === 'textarea' || field.type === 'location';
            const val = formData[field.name] ?? '';
            const error = formErrors[field.name];

            return (
              <div key={field.id} className={`space-y-1.5 ${isFullWidth ? 'sm:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold font-mono text-slate-300 flex items-center gap-1.5">
                    <span>{field.label}</span>
                    {field.required ? (
                      <span className="text-rose-400 text-[10px] font-normal font-sans">* {t('form.required')}</span>
                    ) : (
                      <span className="text-slate-500 text-[10px] font-normal font-sans">({t('form.optional')})</span>
                    )}
                  </label>
                  {field.unit && (
                    <span className="text-[10px] font-mono text-slate-500">Unit: {field.unit}</span>
                  )}
                </div>

                {/* Field Type Switcher */}
                {field.type === 'select' ? (
                  <select
                    value={val}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-mono ${
                      error ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-700'
                    }`}
                  >
                    <option value="">{t('form.selectOption')}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={val}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || 'Enter field context or notes...'}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all placeholder:text-slate-600 ${
                      error ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-700'
                    }`}
                  />
                ) : field.type === 'boolean' ? (
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                      className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-400"
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      {val ? 'Affirmative / Yes' : 'Negative / No'}
                    </span>
                  </label>
                ) : field.type === 'location' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-300">
                      {typeof val === 'object' && val.lat !== undefined ? (
                        <span className="text-emerald-400">
                          {val.lat.toFixed(4)}, {val.lng.toFixed(4)} (±{val.accuracy_meters}m)
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No GPS coordinates captured</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetGpsLocation(field.name)}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-300 border border-slate-700 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Capture GPS Fix</span>
                    </button>
                  </div>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={val}
                    onChange={(e) =>
                      handleFieldChange(
                        field.name,
                        field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                      )
                    }
                    placeholder={field.placeholder || ''}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all ${
                      error ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-700'
                    }`}
                  />
                )}

                {error && <p className="text-[10px] text-rose-400 font-mono">{error}</p>}
                {field.helpText && <p className="text-[10px] text-slate-500">{field.helpText}</p>}
              </div>
            );
          })}
        </div>

        {/* Collapsible Metadata Strip (Requirement 8) */}
        <MetadataStrip
          workerId={currentWorker.id}
          workerRole={currentWorker.role}
          deviceId={currentWorker.deviceId}
          timestamp={new Date().toISOString()}
          parentRev={activeRecord?.rev || '1-base00'}
          gpsCoords={currentWorker.defaultGps}
        />

        {/* Footer & Submit Action */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Target Lineage: <code className="text-amber-400 font-bold">{activeRecord?.rev || '1-base00'}</code></span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl font-bold font-mono text-xs bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
            <span>{isSubmitting ? t('form.submitting') : t('form.submitToOutbox')}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackToast && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 font-mono">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">{t('form.savedSuccess')}</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">{feedbackToast}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
