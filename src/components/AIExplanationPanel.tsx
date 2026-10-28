import React from 'react';
import { type AITriageData } from '../db/schema';
import { useTranslation } from '../i18n';
import {
  Sparkles,
  FileText,
  Check,
  ShieldAlert
} from 'lucide-react';

export interface AIExplanationPanelProps {
  triageData: AITriageData;
  className?: string;
}

export const AIExplanationPanel: React.FC<AIExplanationPanelProps> = ({
  triageData,
  className = ''
}) => {
  const { t } = useTranslation();

  const confidencePct = Math.round((triageData.confidence_score ?? 0.94) * 100);

  return (
    <div
      className={`p-6 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-950 to-sky-950/70 border border-indigo-500/40 space-y-5 shadow-2xl font-mono ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {t('aiPanel.title')}
              <span className="px-2 py-0.5 text-[10px] rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {t('aiPanel.modelBadge')}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Evaluated timestamp delta, role authority, GPS precision, and data completeness.
            </p>
          </div>
        </div>

        {/* Confidence Meter Badge */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-indigo-500/40 text-xs">
          <span className="text-slate-400 font-medium">{t('aiPanel.confidence')}:</span>
          <span className="font-bold text-emerald-400">{confidencePct}%</span>
          <div className="w-14 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Discrepancy Summary / Headline */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/20 space-y-2">
        <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          {t('aiPanel.rootCause')}
        </span>
        <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
          {triageData.summary_of_discrepancy}
        </p>
      </div>

      {/* Plain Language Narrative */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
        <span className="font-bold text-indigo-300 text-[11px] uppercase tracking-wider block">
          AI Semantic & Operational Rationale
        </span>
        <p className="leading-relaxed font-sans text-slate-300">
          {triageData.plain_explanation}
        </p>
      </div>

      {/* Evidence Analysis Breakdown (Strengths for Node A vs Node B) */}
      {triageData.evidence_breakdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Node A Strengths */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-sky-500/20 space-y-2">
            <span className="font-bold text-sky-300 text-[11px] uppercase flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-sky-400" />
              Node Alpha Evidence Weights:
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 font-sans">
              {triageData.evidence_breakdown.node_a_strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-sky-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Node B Strengths */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-purple-500/20 space-y-2">
            <span className="font-bold text-purple-300 text-[11px] uppercase flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-purple-400" />
              Node Beta Evidence Weights:
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 font-sans">
              {triageData.evidence_breakdown.node_b_strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-purple-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Flagged Context Anomalies */}
      {triageData.data_anomalies_flagged && triageData.data_anomalies_flagged.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Context Anomaly Flags:
          </span>
          {triageData.data_anomalies_flagged.map((flag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
            >
              • {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
