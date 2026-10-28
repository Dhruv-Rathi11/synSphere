import React from 'react';
import { useNetworkStatus } from './NetworkManager';
import { Wifi, WifiOff } from 'lucide-react';

export const NetworkSimulatorBar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    isSimulatedOnline,
    setIsSimulatedOnline,
    isBrowserOnline,
    setIsManualOverride,
    baseStationUrl
  } = useNetworkStatus();

  const handleToggle = () => {
    setIsManualOverride(true);
    setIsSimulatedOnline((prev) => !prev);
  };

  return (
    <div
      className={`glass-panel-elevated rounded-2xl p-3.5 sm:p-4 border font-mono transition-all duration-300 ${
        isSimulatedOnline
          ? 'border-emerald-500/30 bg-slate-900/90 shadow-lg shadow-emerald-500/5'
          : 'border-amber-500/30 bg-slate-900/90 shadow-lg shadow-amber-500/5'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isSimulatedOnline
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isSimulatedOnline ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md border ${
                  isSimulatedOnline
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isSimulatedOnline ? 'ONLINE (UPLINK CONNECTED)' : 'OFFLINE (ZERO-WIFI EDGE MODE)'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isSimulatedOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <span>
                Base Station: <code className="text-sky-300">{baseStationUrl}</code>
              </span>
              <span className="text-slate-600">•</span>
              <span>Physical Hardware: {isBrowserOnline ? 'Ready' : 'No Hardware Link'}</span>
            </p>
          </div>
        </div>

        {/* Right Toggle */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={handleToggle}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
              isSimulatedOnline
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isSimulatedOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Simulate Blackout</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Simulate Reconnection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
