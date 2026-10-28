import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type OutboxMutation } from '../db/schema';
import { useDomain } from '../engine/DomainContext';
import { useNetworkStatus } from './NetworkManager';
import {
  Terminal,
  Database,
  Cpu,
  Send,
  CheckCircle2,
  FileCode,
  MapPin,
  Clock,
  Code2,
  Copy,
  Sparkles,
  Server
} from 'lucide-react';

export const EdgeNodeStudio: React.FC = () => {
  const { activePreset, documentHead, refreshDocumentHead } = useDomain();
  const { isSimulatedOnline } = useNetworkStatus();

  // Active selected edge worker node (Alpha vs Beta)
  const [selectedNodeId, setSelectedNodeId] = useState<string>(activePreset.nodeAlpha.id);

  // Dynamic form state initialized with Node Alpha sample payload
  const [formData, setFormData] = useState<Record<string, any>>(activePreset.nodeAlpha.samplePayload);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastCommittedId, setLastCommittedId] = useState<number | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Live queries from Dexie IndexedDB
  const outboxEntries = useLiveQuery<OutboxMutation[]>(() =>
    db.outbox.where({ record_id: activePreset.documentId }).toArray()
  , [activePreset.documentId]);

  const activeNode = selectedNodeId === activePreset.nodeBeta.id ? activePreset.nodeBeta : activePreset.nodeAlpha;

  // Whenever domain or node changes, load the matching default payload
  useEffect(() => {
    setSelectedNodeId(activePreset.nodeAlpha.id);
    setFormData(activePreset.nodeAlpha.samplePayload);
  }, [activePreset.id]);

  const handleNodeSwitch = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (nodeId === activePreset.nodeBeta.id) {
      setFormData(activePreset.nodeBeta.samplePayload);
    } else {
      setFormData(activePreset.nodeAlpha.samplePayload);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCommitDelta = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackToast(null);

    try {
      const timestamp = new Date().toISOString();
      const parentRev = documentHead.rev || '1-base00';

      const mutation: OutboxMutation = {
        record_id: activePreset.documentId,
        parent_rev: parentRev,
        worker_id: activeNode.id,
        worker_role: activeNode.role,
        timestamp,
        gps_coords: {
          lat: activeNode.defaultGps.lat + (Math.random() - 0.5) * 0.0002,
          lng: activeNode.defaultGps.lng + (Math.random() - 0.5) * 0.0002,
          accuracy_meters: activeNode.defaultGps.accuracy_meters
        },
        data: {
          ...formData,
          updated_at: timestamp
        },
        synced: false
      };

      const queueId = await db.outbox.add(mutation);
      setLastCommittedId(queueId);
      setFeedbackToast(
        `Delta buffered in IndexedDB outbox! [Queue #${queueId} | Parent Rev: ${parentRev} | Node: ${activeNode.name}]`
      );

      await refreshDocumentHead();

      setTimeout(() => {
        setFeedbackToast(null);
      }, 4500);
    } catch (err) {
      console.error('Failed to buffer delta in outbox:', err);
      setFeedbackToast('Failed to buffer mutation in local edge outbox.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPayloadJson = () => {
    navigator.clipboard.writeText(JSON.stringify(formData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 1. Infrastructure Target Document Header */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-sky-500/30 bg-slate-900/90 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight font-mono">
                  Edge Node Studio
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Schema: {activePreset.schemaVersion}
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Node ID: {activeNode.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activePreset.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Target Doc:</span>
              <span className="font-bold text-sky-300">{activePreset.documentId}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Vector Base:</span>
              <code className="text-amber-400 font-bold">{documentHead.rev}</code>
            </div>
          </div>
        </div>

        {/* Distributed Metadata Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-slate-400 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Engine</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
              <Database className="w-3 h-3 text-emerald-400" />
              Dexie.js (IDB Outbox)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Ingestion Protocol</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
              <Server className="w-3 h-3 text-sky-400" />
              MVCC Delta Sync
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Edge Telemetry Lock</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-indigo-400" />
              GPS ±{activeNode.defaultGps.accuracy_meters}m Lock
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Network State</span>
            <span
              className={`font-semibold flex items-center gap-1 mt-0.5 ${
                isSimulatedOnline ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSimulatedOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {isSimulatedOnline ? 'Uplink Ready' : 'Edge Storage (Zero-WiFi)'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Workstation: Node Selector & State Delta Sandbox */}
      <form onSubmit={handleCommitDelta} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Node Selector & Schema-Driven Inputs */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/90 space-y-6 shadow-xl">
          {/* Node Identifier Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              Simulated Worker Node Identifier
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[activePreset.nodeAlpha, activePreset.nodeBeta].map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleNodeSwitch(node.id)}
                    className={`p-4 rounded-2xl text-left transition-all cursor-pointer border relative ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-400/80 ring-2 ring-sky-400/20 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white font-mono">{node.name}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-700'
                        }`}
                      />
                    </div>
                    <p className="text-xs font-medium text-sky-300 mt-1">{node.role}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {node.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Schema Fields */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Structured State Delta Inputs
              </label>
              <button
                type="button"
                onClick={() => setFormData(activeNode.samplePayload)}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Reset to Node Default</span>
              </button>
            </div>

            {/* Dynamic input generators based on keyAttributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activePreset.keyAttributes.map((attr) => {
                const val = formData[attr.key] ?? '';
                const isFullWidth = attr.type === 'string' && attr.key.includes('notes');

                return (
                  <div key={attr.key} className={`space-y-1.5 ${isFullWidth ? 'sm:col-span-2' : ''}`}>
                    <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase">
                      {attr.label} <span className="text-slate-600 font-normal">({attr.key})</span>
                    </label>

                    {attr.type === 'status' ? (
                      <select
                        value={val}
                        onChange={(e) => handleFieldChange(attr.key, e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all font-mono"
                      >
                        {activePreset.id === 'disaster_relief' ? (
                          <>
                            <option value="Operational - Full Stock">Operational - Full Stock</option>
                            <option value="Operational - Partial Stock">Operational - Partial Stock</option>
                            <option value="Critical Shortage">Critical Shortage</option>
                            <option value="Stock Depleted">Stock Depleted</option>
                          </>
                        ) : activePreset.id === 'grid_inspection' ? (
                          <>
                            <option value="Nominal">Nominal</option>
                            <option value="Warning - Thermal Spike">Warning - Thermal Spike</option>
                            <option value="Degraded">Degraded</option>
                            <option value="Critical Failure Imminent">Critical Failure Imminent</option>
                          </>
                        ) : (
                          <>
                            <option value="Completed">Completed (Verified)</option>
                            <option value="Pending">Pending (Unadministered)</option>
                          </>
                        )}
                      </select>
                    ) : isFullWidth ? (
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => handleFieldChange(attr.key, e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-sans text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all placeholder:text-slate-600"
                      />
                    ) : (
                      <input
                        type={attr.type === 'number' ? 'number' : 'text'}
                        value={val}
                        onChange={(e) =>
                          handleFieldChange(
                            attr.key,
                            attr.type === 'number' ? Number(e.target.value) : e.target.value
                          )
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Action & Feedback */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Parent Rev Target: <b className="text-amber-400">{documentHead.rev}</b></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold font-mono text-xs bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Buffering in IDB...' : 'Commit Delta to Local Outbox'}</span>
            </button>
          </div>

          {feedbackToast && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-mono">{feedbackToast}</span>
            </div>
          )}
        </div>

        {/* Right Column (5 Cols): Live JSON Payload Inspector & Distributed Ledger Outbox */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live JSON Inspector */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800 bg-slate-950/80 space-y-3 font-mono shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live JSON Payload Delta
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPayloadJson}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-sky-300 overflow-x-auto leading-relaxed max-h-56">
              {JSON.stringify(
                {
                  record_id: activePreset.documentId,
                  parent_rev: documentHead.rev,
                  worker_node: activeNode.id,
                  worker_role: activeNode.role,
                  delta_payload: formData
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Outbox Ledger Queue View */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800 bg-slate-900/70 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Uncommitted Edge Outbox ({outboxEntries?.length ?? 0} Mutations)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Storage: Dexie.js
              </span>
            </div>

            {(!outboxEntries || outboxEntries.length === 0) ? (
              <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 text-center text-xs font-mono text-slate-500">
                Outbox memory clean. Commit a delta above to stage an offline mutation.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 font-mono text-xs">
                {outboxEntries.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      item.id === lastCommittedId
                        ? 'bg-sky-950/40 border-sky-500/50'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 text-[10px]">
                        Queue #{item.id} • {item.worker_role.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-amber-400">
                        Parent: {item.parent_rev}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      Payload: <code className="text-slate-200">{JSON.stringify(item.data)}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
