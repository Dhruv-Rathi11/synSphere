import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type GenericRecord, type FormSchema } from '../db/schema';
import { RecordStatusBadge } from './RecordStatusBadge';
import {
  Database,
  Search,
  Filter,
  Eye,
  Clock,
  X,
  Code2,
  Copy,
  Check,
  FileText
} from 'lucide-react';

export const RecordListView: React.FC = () => {
  const records = useLiveQuery<GenericRecord[]>(() =>
    db.records.reverse().sortBy('updated_at')
  ) ?? [];

  const schemas = useLiveQuery<FormSchema[]>(() => db.schemas.toArray()) ?? [];

  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<GenericRecord | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const filteredRecords = records.filter((r) => {
    if (selectedSchemaId !== 'all' && r.schema_id !== selectedSchemaId) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchData = JSON.stringify(r.data).toLowerCase().includes(q);
      const matchWorker = r.metadata?.created_by_worker_role?.toLowerCase().includes(q);
      return matchId || matchData || matchWorker;
    }
    return true;
  });

  const getSchemaTitle = (schemaId: string): string => {
    const s = schemas.find((item) => item.id === schemaId);
    return s?.title || schemaId;
  };

  const handleCopyRecordJson = (rec: GenericRecord) => {
    navigator.clipboard.writeText(JSON.stringify(rec, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-mono">
      {/* Header Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-sky-500/20 bg-slate-900/90 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Universal Record Archive
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {records.length} Saved
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Unified data store for all schemas. Track local revisions, sync badges, and audit telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records by ID, content, worker..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSchemaId}
              onChange={(e) => setSelectedSchemaId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
            >
              <option value="all">All Schemas ({schemas.length})</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Record Cards Grid */}
      {filteredRecords.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center border border-slate-800 bg-slate-900/60 space-y-2">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Records Found</h3>
          <p className="text-xs text-slate-500 font-sans">Submit a dynamic form entry to populate this archive.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-slate-700 bg-slate-900/80 transition-all space-y-3 shadow-lg group cursor-pointer"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{record.id}</span>
                  <span className="text-[10px] text-sky-400 font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    {getSchemaTitle(record.schema_id).split(' ')[0]}
                  </span>
                </div>
                <RecordStatusBadge status={record.sync_status} rev={record.rev} />
              </div>

              {/* Data Summary Preview */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850 text-xs text-slate-300 space-y-1 max-h-28 overflow-hidden">
                {Object.entries(record.data).slice(0, 3).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-0.5 text-[11px] border-b border-slate-900/60 last:border-0">
                    <span className="text-slate-500 uppercase">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-slate-200 truncate max-w-[200px]">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer Metadata */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(record.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRecord(record);
                  }}
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Record</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 font-mono shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Record Inspector: {selectedRecord.id}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Schema Lineage</span>
                <span className="font-bold text-white">{getSchemaTitle(selectedRecord.schema_id)}</span>
              </div>
              <RecordStatusBadge status={selectedRecord.sync_status} rev={selectedRecord.rev} />
            </div>

            {/* Formatted Data */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Record Attributes:</span>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                {Object.entries(selectedRecord.data).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-slate-900 last:border-0">
                    <span className="text-slate-400">{k}:</span>
                    <span className="font-bold text-sky-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5" />
                  Raw Stored Document JSON:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyRecordJson(selectedRecord)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(selectedRecord, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
