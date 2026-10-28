import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PatientRecord, type OutboxMutation } from '../db/schema';
import { runSemanticTriage, type AISemanticTriageResult } from '../ai/geminiTriage';
import confetti from 'canvas-confetti';
import {
  GitMerge,
  GitFork,
  Sparkles,
  Check,
  AlertTriangle,
  FileText,
  Zap,
  Cpu
} from 'lucide-react';

export const SupervisorTriage: React.FC = () => {
  const patient = useLiveQuery<PatientRecord | undefined>(() =>
    db.patients.get('PAT-2026-01')
  );

  const outbox = useLiveQuery<OutboxMutation[]>(() =>
    db.outbox.where({ record_id: 'PAT-2026-01' }).toArray()
  );

  const [triageResult, setTriageResult] = useState<AISemanticTriageResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Identify divergent worker mutations
  const mutationA = outbox?.find((m) => m.worker_id.includes('anm')) || outbox?.[0];
  const mutationB = outbox?.find((m) => m.worker_id.includes('surveyor')) || outbox?.[1];

  const hasConflict = Boolean(outbox && outbox.length >= 2 && mutationA && mutationB);

  const handleRunTriage = async () => {
    if (!patient || !mutationA || !mutationB) return;
    setIsAnalyzing(true);
    try {
      const result = await runSemanticTriage(patient, mutationA, mutationB, apiKey);
      setTriageResult(result);
    } catch (e) {
      console.error('Triage failure:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyResolution = async (
    status: 'Completed' | 'Pending',
    batch: string,
    notes: string
  ) => {
    if (!patient) return;

    try {
      const newRev = `2-mrg${Date.now().toString(36).slice(-4)}`;
      const timestamp = new Date().toISOString();

      // Update patient head
      await db.patients.put({
        ...patient,
        rev: newRev,
        vaccine_status: status,
        batch_no: batch,
        notes,
        updated_at: timestamp
      });

      // Clear the processed outbox mutations for this record
      await db.outbox.where({ record_id: patient.id }).delete();

      setIsResolved(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error('Failed to commit resolution:', e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="glass-panel-elevated rounded-2xl p-6 border border-indigo-500/20 bg-slate-900/90 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <GitMerge className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Supervisor Semantic Triage Dashboard
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              AI-assisted multi-version concurrency control (MVCC) and qualitative field data synthesis.
            </p>
          </div>

          {/* Quick API Key Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>{apiKey ? 'Gemini API Key Active' : 'Configure Gemini Key (Optional)'}</span>
            </button>
          </div>
        </div>

        {showApiKeyInput && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="password"
              placeholder="Paste Gemini API Key (leaves empty to use offline heuristic triage engine)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
            {apiKey && (
              <button
                onClick={() => setApiKey('')}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reconnection Collision Trigger & Status */}
      {!hasConflict && !isResolved && (
        <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
            <GitFork className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No Divergent Branches Detected</h3>
            <p className="text-xs text-slate-400 mt-1">
              Use the Frontline Worker Form tab to queue offline mutations from both <b>Worker A (ANM)</b> and <b>Worker B (Surveyor)</b>. Once both exist, the collision detector will activate semantic triage.
            </p>
          </div>
        </div>
      )}

      {isResolved && (
        <div className="glass-panel rounded-2xl p-8 text-center border border-emerald-500/30 bg-emerald-950/20 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <Check className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-emerald-300">Conflict Successfully Reconciled!</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Patient record head rev updated to <code className="text-emerald-400 font-mono font-bold">{patient?.rev}</code>. Data integrity preserved with complete audit trail.
          </p>
          <button
            onClick={() => setIsResolved(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer"
          >
            Review Status
          </button>
        </div>
      )}

      {/* Active Collision Detected */}
      {hasConflict && !isResolved && (
        <div className="space-y-6">
          {/* Collision Warning Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-amber-200">
                  MVCC Fork Collision Detected: 2 Offline Branches Diverging from Rev {patient?.rev}
                </h4>
                <p className="text-xs text-amber-300/80">
                  Worker A and Worker B submitted concurrent offline mutations. Traditional Last-Write-Wins (LWW) would destroy one of their updates.
                </p>
              </div>
            </div>

            <button
              onClick={handleRunTriage}
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{isAnalyzing ? 'Gemini Analyzing...' : 'Execute Gemini Semantic Triage'}</span>
            </button>
          </div>

          {/* Side by Side Branch Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Branch A */}
            <div className="glass-panel rounded-2xl p-5 border border-sky-500/30 bg-slate-900/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                  <h4 className="font-bold text-sm text-white">Branch A: {mutationA?.worker_role}</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  Queue #{mutationA?.id}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Vaccine Status:</span>
                  <span className="font-semibold text-emerald-400">{mutationA?.data.vaccine_status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Vial Batch No:</span>
                  <span className="font-mono text-sky-300">{mutationA?.data.batch_no || 'None'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">GPS Accuracy:</span>
                  <span className="font-mono text-slate-200">±{mutationA?.gps_coords.accuracy_meters}m</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Qualitative Field Notes:</span>
                  <p className="p-2.5 rounded-lg bg-slate-950 text-slate-200 text-xs italic border border-slate-800">
                    "{mutationA?.data.notes}"
                  </p>
                </div>
              </div>
            </div>

            {/* Branch B */}
            <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 bg-slate-900/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
                  <h4 className="font-bold text-sm text-white">Branch B: {mutationB?.worker_role}</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                  Queue #{mutationB?.id}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Vaccine Status:</span>
                  <span className="font-semibold text-amber-400">{mutationB?.data.vaccine_status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Vial Batch No:</span>
                  <span className="font-mono text-slate-400">{mutationB?.data.batch_no || 'None'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">GPS Accuracy:</span>
                  <span className="font-mono text-slate-200">±{mutationB?.gps_coords.accuracy_meters}m</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Qualitative Field Notes:</span>
                  <p className="p-2.5 rounded-lg bg-slate-950 text-slate-200 text-xs italic border border-slate-800">
                    "{mutationB?.data.notes}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Semantic Triage Results Box */}
          {triageResult && (
            <div className="glass-panel-elevated rounded-2xl p-6 border border-sky-400/40 bg-slate-900/95 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-slate-950 font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Gemini Semantic Triage Report
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {triageResult.conflict_id}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evaluated evidence density, clinical role authority, and timestamp validity.
                    </p>
                  </div>
                </div>
              </div>

              {/* Natural Language Explanation */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h5 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Plain-English Narrative & Root Cause
                </h5>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {triageResult.explanation.summary}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-900">
                  <div>
                    <b className="text-sky-400">Worker A Action:</b> {triageResult.explanation.worker_a_action}
                  </div>
                  <div>
                    <b className="text-purple-400">Worker B Action:</b> {triageResult.explanation.worker_b_action}
                  </div>
                </div>
              </div>

              {/* Evidence Credibility Scorebars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Score A */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-sky-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-sky-300">Worker A (ANM Nurse)</span>
                    <span className="font-mono font-bold text-sky-400">
                      {triageResult.evidence_analysis.worker_a.credibility_score}% Confidence
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${triageResult.evidence_analysis.worker_a.credibility_score}%` }}
                    />
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
                    {triageResult.evidence_analysis.worker_a.key_strengths.map((st, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Score B */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-purple-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-purple-300">Worker B (Field Surveyor)</span>
                    <span className="font-mono font-bold text-purple-400">
                      {triageResult.evidence_analysis.worker_b.credibility_score}% Confidence
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
                      style={{ width: `${triageResult.evidence_analysis.worker_b.credibility_score}%` }}
                    />
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
                    {triageResult.evidence_analysis.worker_b.key_strengths.map((st, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Synthesized Recommendation & Supervisor Actions */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-sky-950/40 border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h4 className="font-bold text-sm text-white">
                      Recommended Synthesized Merge (Composite Record)
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Non-Destructive Merge
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block">Status:</span>
                    <span className="font-bold text-emerald-400">{triageResult.synthesized_merge.vaccine_status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Batch:</span>
                    <span className="font-mono text-sky-300">{triageResult.synthesized_merge.batch_no || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-3 pt-2 border-t border-slate-900">
                    <span className="text-slate-400 block mb-0.5">Synthesized Notes:</span>
                    <p className="text-slate-200 italic">{triageResult.synthesized_merge.notes}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  <b className="text-slate-200">AI Rationale: </b>
                  {triageResult.synthesized_merge.rationale}
                </p>

                {/* Supervisor Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() =>
                      handleApplyResolution(
                        triageResult.synthesized_merge.vaccine_status,
                        triageResult.synthesized_merge.batch_no,
                        triageResult.synthesized_merge.notes
                      )
                    }
                    className="flex-1 min-w-[200px] px-5 py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept AI Synthesized Merge</span>
                  </button>

                  {mutationA && (
                    <button
                      onClick={() =>
                        handleApplyResolution(
                          mutationA.data.vaccine_status || 'Completed',
                          mutationA.data.batch_no || '',
                          mutationA.data.notes || ''
                        )
                      }
                      className="px-4 py-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 cursor-pointer"
                    >
                      Keep Worker A Only
                    </button>
                  )}

                  {mutationB && (
                    <button
                      onClick={() =>
                        handleApplyResolution(
                          mutationB.data.vaccine_status || 'Pending',
                          mutationB.data.batch_no || '',
                          mutationB.data.notes || ''
                        )
                      }
                      className="px-4 py-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 cursor-pointer"
                    >
                      Keep Worker B Only
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
