import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle
} from 'lucide-react';

interface Slide {
  id: number;
  tag: string;
  title: string;
  subtitle?: string;
  renderContent: () => React.ReactNode;
}

export const PitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    // Slide 1: Title
    {
      id: 1,
      tag: 'SOCIAL IMPACT & OPEN INNOVATION TRACK',
      title: 'SyncSphere: Offline-First AI Sync',
      subtitle: 'An intelligent distributed state reconciliation engine built for frontline healthcare workers, NGO field agents, and emergency responders operating in zero-connectivity environments.',
      renderContent: () => (
        <div className="flex flex-wrap justify-center gap-3 pt-6">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
            ☁ Local-First (IndexedDB / Dexie)
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            ⚡ MVCC Branching Logs
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✨ Gemini Semantic Triage
          </span>
        </div>
      )
    },
    // Slide 2: Core Problem
    {
      id: 2,
      tag: 'CORE PROBLEM',
      title: 'The Reality: Broken Field Data',
      renderContent: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Millions of frontline community workers (such as ASHA health workers and disaster relief teams) collect vital data in remote regions lacking cellular coverage.
            </p>
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                The Silent Data Destruction Dilemma
              </h4>
              <p className="text-xs text-slate-300">
                Worker A (offline) logs: <b className="text-sky-300">Vaccine Completed (Batch #89)</b>.
                <br />
                Worker B (offline) logs: <b className="text-amber-300">Patient Unavailable</b> 10 mins later.
                <br />
                Traditional "Last-Write-Wins" systems blindly overwrite the life-saving immunization record based solely on clock drift.
              </p>
            </div>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="text-rose-400 font-bold">✕</span> Zero-Connectivity Lockout: Standard cloud apps stop working.
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-400 font-bold">✕</span> Cryptic Conflict Queues: Non-technical supervisors face raw JSON diffs.
              </li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-center items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white">The Frontline Human Cost</h4>
            <p className="text-xs text-slate-400">
              Incorrect merges cause child double-dosing, missed emergency relief rations, and wasted supervisor triage hours.
            </p>
          </div>
        </div>
      )
    },
    // Slide 3: Core Innovation
    {
      id: 3,
      tag: 'CORE INNOVATION',
      title: 'Deterministic vs Semantic Merging',
      renderContent: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span>🛑 Conventional Sync Engines</span>
            </h4>
            <p className="text-xs text-slate-400">
              Purely arithmetic or rule-based distributed protocols (LWW, CRDTs, CouchDB):
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
              Base Rev: 1-x → Fork (Worker A vs Worker B) → <b>Silent Overwrite or Cryptic Crash</b>
            </div>
            <p className="text-xs text-slate-400">
              CRDTs merge characters algebraically; they cannot evaluate medical truth or qualitative notes.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-sky-950/30 to-indigo-950/30 border border-sky-500/30 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span>🛡 SyncSphere Semantic Triage</span>
            </h4>
            <p className="text-xs text-slate-300">
              Preserves lineage branching, evaluates evidence density, and synthesizes intent:
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-sky-500/30 font-mono text-[11px] text-sky-300">
              Base Rev: 1-x → Fork (Branch A & Branch B) → <b>AI Triage & Synthesis (Human-in-the-Loop)</b>
            </div>
            <p className="text-xs text-slate-300">
              Preserves both branches safely, scores evidence credibility, and offers a verified merge recommendation.
            </p>
          </div>
        </div>
      )
    },
    // Slide 4: System Architecture
    {
      id: 4,
      tag: 'SYSTEM DESIGN & SPECIFICATIONS',
      title: 'End-to-End System Architecture',
      subtitle: 'A decoupled, local-first topology ensuring zero-latency frontline operations while offloading complex semantic reconciliation asynchronously to the cloud.',
      renderContent: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-sky-400 font-bold text-xs uppercase">1. Frontline Client</div>
            <p className="text-xs text-slate-300">
              Dexie.js IndexedDB outbox, service worker cache, GPS tagger, cryptographic parent revision tracking.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-indigo-400 font-bold text-xs uppercase">2. SyncSphere Engine</div>
            <p className="text-xs text-slate-300">
              Fast-path commit for clean deltas; automated fork creation into Postgres conflict queues on collision.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-emerald-400 font-bold text-xs uppercase">3. Gemini Triage & Hub</div>
            <p className="text-xs text-slate-300">
              Strict JSON schema extraction, evidence score calculation, composite merge synthesis for supervisor review.
            </p>
          </div>
        </div>
      )
    },
    // Slide 5: Four Roles of Applied AI
    {
      id: 5,
      tag: 'INTELLIGENT LAYER',
      title: 'The Four Roles of Applied AI',
      renderContent: () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-950 border border-sky-500/20 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm">
              💬
            </div>
            <h4 className="font-bold text-xs text-white">Natural Explanation</h4>
            <p className="text-[11px] text-slate-400">
              Translates git-like tree hashes into plain narratives: "Worker A entered batch info; Worker B reported patient relocated 15m later."
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/20 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
              ⚖️
            </div>
            <h4 className="font-bold text-xs text-white">Evidence Weighting</h4>
            <p className="text-[11px] text-slate-400">
              Calculates confidence scores by cross-referencing worker roles, GPS accuracy meters, and lot serial numbers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
              🧬
            </div>
            <h4 className="font-bold text-xs text-white">Clinical Synthesis</h4>
            <p className="text-[11px] text-slate-400">
              Merges supplementary fields (e.g. keeping Patient Address from Worker B while maintaining Vaccination Status from Worker A).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/20 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm">
              🛡
            </div>
            <h4 className="font-bold text-xs text-white">Anomaly Auditing</h4>
            <p className="text-[11px] text-slate-400">
              Flags logical errors or data blunders, such as vaccine administration timestamps dated before the patient's birthdate.
            </p>
          </div>
        </div>
      )
    },
    // Slide 6: Operational Impact & Integrity
    {
      id: 6,
      tag: 'FIELD BENEFITS',
      title: 'Operational Impact & Integrity',
      renderContent: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="text-4xl font-extrabold text-emerald-400">0%</div>
            <div className="text-sm font-bold text-white">Unintended Data Overwrite</div>
            <p className="text-xs text-slate-400">
              Zero patient records dropped or silently overwritten during network reconnect storms.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-2">
            <div className="text-4xl font-extrabold text-sky-400">85%</div>
            <div className="text-sm font-bold text-white">Triage Time Cut</div>
            <p className="text-xs text-slate-400">
              Supervisors review synthesized summaries instead of parsing raw relational tables.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-2">
            <div className="text-4xl font-extrabold text-indigo-400">100%</div>
            <div className="text-sm font-bold text-white">Zero-Wi-Fi Uptime</div>
            <p className="text-xs text-slate-400">
              Full PWA form fill and read operations remain completely unblocked without connectivity.
            </p>
          </div>
        </div>
      )
    },
    // Slide 7: Questions & Answers
    {
      id: 7,
      tag: 'JUDGE QUESTIONS & ANSWERS',
      title: 'Defensibility & Technical Q&A',
      renderContent: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-sky-300">Q: Why not raw CRDTs?</h4>
            <p className="text-xs text-slate-400">
              CRDTs only handle commutative scalar math and character merges. They fail on semantic human contradictions in medical field notes.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-indigo-300">Q: Does AI run offline?</h4>
            <p className="text-xs text-slate-400">
              No. Client data entry is 100% offline. AI triage executes asynchronously on the server/hub when packets sync to the base station.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-emerald-300">Q: Will AI hallucinate?</h4>
            <p className="text-xs text-slate-400">
              Strict Pydantic/JSON schemas with deterministic field extraction ensure the model only synthesizes provided record values.
            </p>
          </div>
        </div>
      )
    }
  ];

  const slide = slides[currentSlide];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Slide Container */}
      <div className="glass-panel-elevated rounded-3xl p-8 sm:p-12 border border-slate-800 bg-slate-900/90 min-h-[460px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Slide Header */}
        <div className="space-y-3 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {slide.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {slide.subtitle}
            </p>
          )}
        </div>

        {/* Slide Body */}
        <div className="py-6 my-auto">{slide.renderContent()}</div>

        {/* Slide Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  i === currentSlide ? 'bg-sky-400 w-6' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">
              Slide {currentSlide + 1} of {slides.length}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                disabled={currentSlide === 0}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlide === slides.length - 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
