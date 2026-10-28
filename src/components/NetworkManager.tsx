import React, { createContext, useContext, useState, useEffect } from 'react';
import { Wifi, WifiOff, Radio, RefreshCw, Server } from 'lucide-react';

export interface NetworkContextType {
  isSimulatedOnline: boolean;
  setIsSimulatedOnline: (value: boolean | ((prev: boolean) => boolean)) => void;
  isBrowserOnline: boolean;
  isManualOverride: boolean;
  setIsManualOverride: (value: boolean) => void;
  baseStationUrl: string;
}

export const NetworkContext = createContext<NetworkContextType>({
  isSimulatedOnline: false,
  setIsSimulatedOnline: () => {},
  isBrowserOnline: true,
  isManualOverride: true,
  setIsManualOverride: () => {},
  baseStationUrl: 'http://localhost:8000'
});

export const useNetworkStatus = () => useContext(NetworkContext);

export interface NetworkProviderProps {
  children: React.ReactNode;
  defaultOnline?: boolean;
  baseStationUrl?: string;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
  defaultOnline = false,
  baseStationUrl = 'http://localhost:8000'
}) => {
  // Default simulated state: false (Offline edge storage)
  const [isSimulatedOnline, setIsSimulatedOnline] = useState<boolean>(defaultOnline);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isManualOverride, setIsManualOverride] = useState<boolean>(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      if (!isManualOverride) {
        setIsSimulatedOnline(true);
      }
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
      if (!isManualOverride) {
        setIsSimulatedOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isManualOverride]);

  return (
    <NetworkContext.Provider
      value={{
        isSimulatedOnline,
        setIsSimulatedOnline,
        isBrowserOnline,
        isManualOverride,
        setIsManualOverride,
        baseStationUrl
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export interface NetworkManagerProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkManager: React.FC<NetworkManagerProps> = ({
  className = '',
  showDetails = true
}) => {
  const {
    isSimulatedOnline,
    setIsSimulatedOnline,
    isBrowserOnline,
    isManualOverride,
    setIsManualOverride,
    baseStationUrl
  } = useNetworkStatus();

  const handleToggle = () => {
    setIsManualOverride(true);
    setIsSimulatedOnline((prev) => !prev);
  };

  return (
    <div
      className={`glass-panel-elevated rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
        isSimulatedOnline
          ? 'border-emerald-500/30 bg-slate-900/90 shadow-lg shadow-emerald-500/5'
          : 'border-rose-500/30 bg-slate-900/90 shadow-lg shadow-rose-500/5'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Network Status Badge */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isSimulatedOnline
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/20'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-md shadow-rose-500/20'
            }`}
          >
            {isSimulatedOnline ? (
              <Wifi className="w-6 h-6 animate-pulse" />
            ) : (
              <WifiOff className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 text-[11px] font-black tracking-wider uppercase rounded-full border transition-all ${
                  isSimulatedOnline
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {isSimulatedOnline
                  ? 'ONLINE (CONNECTED TO BASE STATION)'
                  : 'OFFLINE (EDGE STORAGE ACTIVE)'}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSimulatedOnline
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
            </div>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>
                Topology:{' '}
                <b className="text-slate-200">
                  {isSimulatedOnline ? 'Central Cloud Hub' : 'Local IndexedDB Outbox'}
                </b>
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-400">
                Hardware Link: {isBrowserOnline ? 'Physical WiFi/Cellular Available' : 'No Hardware Link'}
              </span>
            </p>
          </div>
        </div>

        {/* Interactive Toggle Switch */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Stage Demo Toggle
            </span>
            <span className="text-[11px] text-slate-400">
              {isSimulatedOnline ? 'Simulate Reconnection' : 'Simulate Blackout'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isSimulatedOnline}
            onClick={handleToggle}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              isSimulatedOnline
                ? 'bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 border-slate-600'
            }`}
          >
            <span className="sr-only">Toggle Network Simulation</span>
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isSimulatedOnline ? 'translate-x-8 text-emerald-600' : 'translate-x-0 text-slate-600'
              }`}
            >
              {isSimulatedOnline ? (
                <Wifi className="w-4 h-4 text-emerald-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-slate-600" />
              )}
            </span>
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Base Station Target: <code className="text-sky-300 font-mono">{baseStationUrl}</code>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Override Mode: <b className="text-slate-200">{isManualOverride ? 'Manual Demo' : 'Auto Hardware'}</b>
              </span>
            </span>

            {isManualOverride && (
              <button
                onClick={() => {
                  setIsManualOverride(false);
                  setIsSimulatedOnline(navigator.onLine);
                }}
                className="text-sky-400 hover:text-sky-300 underline text-[11px] cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync with Hardware</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
