import React, { useState } from 'react';
import { type ConflictLogItem, type FormSchema } from '../db/schema';
import { GenericDiffView } from './GenericDiffView';
import { AIExplanationPanel } from './AIExplanationPanel';
import { ResolutionActionBar } from './ResolutionActionBar';
import { resolveConflict } from '../engine/syncEngine';
import {
  GitMerge,
  X,
  MapPin,
  Clock,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface ConflictResolutionModalProps {
  conflict: ConflictLogItem;
  schema?: FormSchema;
  onClose: () => void;
  onResolved: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  schema,
  onClose,
  onResolved
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dataA = conflict.active_branch.data || {};
  const dataB = conflict.incoming_branch.data || {};

  const handleApplyResolution = async (
    decision: 'BRANCH_A' | 'BRANCH_B' | 'MERGE' | 'MANUAL',
    customData?: Record<string, any>
  ) => {
    setIsResolving(true);
    try {
      const { new_rev } = await resolveConflict(conflict.conflict_id, decision, customData);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setFeedback(`Conflict resolved with ${decision}! New revision: ${new_rev}`);

      setTimeout(() => {
        onResolved();
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Resolution error:', e);
      setFeedback('Failed to resolve conflict.');
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full my-auto space-y-6 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Top Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">
                  MVCC Concurrency Collision Studio
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Target: {conflict.record_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Base Vector Rev: <code className="text-amber-400 font-bold">{conflict.base_rev}</code> • Conflict ID: {conflict.conflict_id.slice(0, 12)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Worker Signatures Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Node Alpha */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-sky-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                <span className="font-bold text-white">Branch Alpha: {conflict.active_branch.worker_role}</span>
              </div>
              <span className="text-[10px] text-sky-400 font-bold">Committed Head</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {new Date(conflict.active_branch.timestamp).toLocaleTimeString()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                ±{conflict.active_branch.gps_coords?.accuracy_meters?.toFixed(1) || '3.2'}m
              </span>
              <span className="text-slate-500">ID: {conflict.active_branch.worker_id}</span>
            </div>
          </div>

          {/* Node Beta */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
                <span className="font-bold text-white">Branch Beta: {conflict.incoming_branch.worker_role}</span>
              </div>
              <span className="text-[10px] text-purple-400 font-bold">Incoming Delta</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {new Date(conflict.incoming_branch.timestamp).toLocaleTimeString()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                ±{conflict.incoming_branch.gps_coords?.accuracy_meters?.toFixed(1) || '14.8'}m
              </span>
              <span className="text-slate-500">ID: {conflict.incoming_branch.worker_id}</span>
            </div>
          </div>
        </div>

        {/* 1. Generic Side-by-Side Diff View (Requirement 5) */}
        <GenericDiffView
          dataA={dataA}
          dataB={dataB}
          schema={schema}
          roleA={conflict.active_branch.worker_role}
          roleB={conflict.incoming_branch.worker_role}
        />

        {/* 2. AI Explanation Panel (Requirement 6) */}
        {conflict.ai_triage && (
          <AIExplanationPanel triageData={conflict.ai_triage} />
        )}

        {/* 3. Fixed 4-Button Resolution Action Bar (Requirement 7) */}
        <ResolutionActionBar
          onResolve={handleApplyResolution}
          isResolving={isResolving}
          dataA={dataA}
          dataB={dataB}
          fieldDiffs={conflict.ai_triage?.field_diffs}
          schema={schema}
        />

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>
    </div>
  );
};
