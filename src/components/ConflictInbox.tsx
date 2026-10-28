import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ConflictLogItem, type FormSchema } from '../db/schema';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { useTranslation } from '../i18n';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  Inbox
} from 'lucide-react';

export const ConflictInbox: React.FC = () => {
  const { t } = useTranslation();

  // Live queries for conflicts and schemas
  const conflicts = useLiveQuery<ConflictLogItem[]>(() =>
    db.conflicts.where({ status: 'PENDING_REVIEW' }).reverse().sortBy('created_at')
  ) ?? [];

  const schemas = useLiveQuery<FormSchema[]>(() => db.schemas.toArray()) ?? [];

  const [selectedConflict, setSelectedConflict] = useState<ConflictLogItem | null>(null);
  const [filterSchemaId, setFilterSchemaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredConflicts = conflicts.filter((c) => {
    if (filterSchemaId !== 'all' && c.schema_id !== filterSchemaId) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchId = c.record_id.toLowerCase().includes(q);
      const matchRoleA = c.active_branch.worker_role.toLowerCase().includes(q);
      const matchRoleB = c.incoming_branch.worker_role.toLowerCase().includes(q);
      return matchId || matchRoleA || matchRoleB;
    }
    return true;
  });

  const getConflictingFieldsList = (conflict: ConflictLogItem): string[] => {
    if (conflict.ai_triage?.field_diffs) {
      return conflict.ai_triage.field_diffs
        .filter((d) => d.divergence_type === 'CONTRADICTORY')
        .map((d) => d.field_name);
    }
    return ['Multiple Divergent Fields'];
  };

  const getActiveSchema = (schemaId: string): FormSchema | undefined => {
    return schemas.find((s) => s.id === schemaId);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-mono">
      {/* Header Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-amber-500/25 bg-slate-900/90 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t('conflictInbox.title')}
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  {conflicts.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                {t('conflictInbox.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total Schemas Monitored:</span>
            <span className="font-bold text-sky-400">{schemas.length}</span>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by record ID, worker name, role..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* Schema Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSchemaId}
              onChange={(e) => setFilterSchemaId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
            >
              <option value="all">{t('conflictInbox.filterAll')}</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conflicts List (Email-like Rows) */}
      {filteredConflicts.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">{t('conflictInbox.emptyTitle')}</h3>
            <p className="text-xs text-slate-400 font-sans">{t('conflictInbox.emptyDesc')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConflicts.map((conflict) => {
            const conflictFields = getConflictingFieldsList(conflict);
            const activeSchema = getActiveSchema(conflict.schema_id);

            return (
              <div
                key={conflict.conflict_id}
                className="glass-panel rounded-2xl p-5 border border-amber-500/30 hover:border-amber-500/60 bg-slate-900/80 transition-all space-y-3 shadow-lg hover:shadow-amber-500/5 group cursor-pointer"
                onClick={() => setSelectedConflict(conflict)}
              >
                {/* Top Row: Record ID, Schema Name, Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-sky-300 font-bold text-xs border border-slate-700">
                      {conflict.record_id}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      {activeSchema?.title || conflict.schema_id}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] text-amber-400">
                      Vector Base: {conflict.base_rev}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(conflict.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Middle Row: Worker Divergence and Conflicting Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 text-xs">
                  {/* Workers Participating */}
                  <div className="md:col-span-4 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Divergent Edge Nodes
                    </span>
                    <div className="text-slate-300 truncate">
                      <b className="text-sky-300">{conflict.active_branch.worker_role.split(' ')[0]}</b> vs{' '}
                      <b className="text-purple-300">{conflict.incoming_branch.worker_role.split(' ')[0]}</b>
                    </div>
                  </div>

                  {/* Conflicting Fields Badges */}
                  <div className="md:col-span-6 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      {t('conflictInbox.conflictingFields')} ({conflictFields.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {conflictFields.map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Review Button */}
                  <div className="md:col-span-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConflict(conflict);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-500/15"
                    >
                      <span>{t('conflictInbox.reviewAction')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI Summary snippet */}
                {conflict.ai_triage && (
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="line-clamp-1 italic font-sans text-slate-300">
                      "{conflict.ai_triage.summary_of_discrepancy}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Resolution Modal */}
      {selectedConflict && (
        <ConflictResolutionModal
          conflict={selectedConflict}
          schema={getActiveSchema(selectedConflict.schema_id)}
          onClose={() => setSelectedConflict(null)}
          onResolved={() => setSelectedConflict(null)}
        />
      )}
    </div>
  );
};
