import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="glass-panel-elevated rounded-2xl p-6 border border-emerald-500/20 bg-slate-900/90 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                District Health & Data Integrity Telemetry
              </h2>
              <p className="text-xs text-slate-400">
                Live metrics across 42 offline village health sub-centers and frontline workers.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ● Live Synchronized
          </span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Silent Overwrites Prevented</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">142</div>
          <p className="text-[11px] text-emerald-300/80">0% Critical Data Lost</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Avg Triage Time</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-sky-400">12 sec</div>
          <p className="text-[11px] text-sky-300/80">85% reduction vs manual diffs</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Frontline Field Uptime</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">100%</div>
          <p className="text-[11px] text-amber-300/80">Zero-Wi-Fi blocking</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Villages Covered</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">42 / 42</div>
          <p className="text-[11px] text-indigo-300/80">Active immunization drive</p>
        </div>
      </div>

      {/* Anomaly Audit Log & Quality Inspector */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-slate-900/90 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-white">AI Data Quality & Anomaly Audit Stream</h3>
          </div>
          <span className="text-xs text-slate-400">Autonomous Heuristic Scans</span>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-white">Cold-Chain Batch Validation Passed (Lot #COV-8902)</div>
              <p className="text-slate-400 mt-0.5">
                Matched district depot release log. Temperature threshold logs verified within 2°C–8°C.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-white">Geographical Precision Lock</div>
              <p className="text-slate-400 mt-0.5">
                Worker A & Worker B coordinates validated against Rampur geographical sector boundary (±3.2m).
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-white">Timestamp Temporal Drift Audit</div>
              <p className="text-slate-400 mt-0.5">
                Mutations timestamped within 15-minute delta interval without clock skew anomalies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
