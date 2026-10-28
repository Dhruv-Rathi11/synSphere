import React, { useState, useRef, useEffect } from 'react';
import { useDomain } from '../engine/DomainContext';
import { DOMAIN_PRESETS, type DomainId } from '../engine/domainPresets';
import {
  Layers,
  Activity,
  Shield,
  Cpu,
  ChevronDown,
  Check
} from 'lucide-react';

export const DomainSwitcher: React.FC = () => {
  const { activeDomainId, setDomain, activePreset } = useDomain();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getDomainIcon = (id: DomainId) => {
    switch (id) {
      case 'rural_health':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'disaster_relief':
        return <Shield className="w-4 h-4 text-sky-400" />;
      case 'grid_inspection':
        return <Cpu className="w-4 h-4 text-purple-400" />;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-sky-500/50 flex items-center gap-2 text-xs font-mono text-white transition-all cursor-pointer shadow-md"
      >
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400 hidden sm:inline">Schema Domain:</span>
          <span className="font-bold text-sky-300">{activePreset.name.split(' ')[0]}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 space-y-1">
          <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Select Data Model Domain
            </span>
            <span className="text-[10px] font-mono text-sky-400">Multi-Model Engine</span>
          </div>

          {(Object.keys(DOMAIN_PRESETS) as DomainId[]).map((id) => {
            const preset = DOMAIN_PRESETS[id];
            const isSelected = activeDomainId === id;

            return (
              <button
                key={id}
                onClick={() => {
                  setDomain(id);
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-xl text-left transition-all flex items-start justify-between cursor-pointer border ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-400/50 shadow-sm'
                    : 'border-transparent hover:bg-slate-900/80 hover:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getDomainIcon(id)}</div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{preset.name}</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Doc: <b className="text-sky-300">{preset.documentId}</b> • {preset.schemaVersion.split('.')[1]}
                    </p>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
