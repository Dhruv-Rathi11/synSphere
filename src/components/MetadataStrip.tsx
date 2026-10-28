import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { type GPSCoords } from '../db/schema';
import {
  User,
  Smartphone,
  MapPin,
  Clock,
  ChevronDown,
  ShieldCheck,
  Hash
} from 'lucide-react';

export interface MetadataStripProps {
  workerId: string;
  workerRole: string;
  deviceId: string;
  timestamp: string;
  parentRev?: string;
  gpsCoords?: GPSCoords;
  className?: string;
  defaultExpanded?: boolean;
}

export const MetadataStrip: React.FC<MetadataStripProps> = ({
  workerId,
  workerRole,
  deviceId,
  timestamp,
  parentRev,
  gpsCoords,
  className = '',
  defaultExpanded = false
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden font-mono text-xs ${className}`}>
      {/* Collapsed Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-300">
            {t('form.auditMetadata')}
          </span>
          <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-800 text-sky-300 border border-slate-700">
            4 Fields Auto-Attached
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>{isExpanded ? t('form.hideMetadata') : t('form.showMetadata')}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Metadata Grid */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] text-slate-300 animate-in fade-in slide-in-from-top-1">
          {/* Worker Identity */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 flex items-center gap-1 text-[10px] uppercase font-bold">
              <User className="w-3 h-3 text-sky-400" />
              {t('form.workerRole')}
            </span>
            <p className="font-bold text-white truncate">{workerRole}</p>
            <p className="text-[10px] text-slate-400 font-mono">ID: {workerId}</p>
          </div>

          {/* Device ID */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 flex items-center gap-1 text-[10px] uppercase font-bold">
              <Smartphone className="w-3 h-3 text-purple-400" />
              {t('form.deviceId')}
            </span>
            <p className="font-bold text-white truncate">{deviceId}</p>
            <p className="text-[10px] text-slate-400">Client UUID Fingerprint</p>
          </div>

          {/* GPS Coordinates */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 flex items-center gap-1 text-[10px] uppercase font-bold">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {t('form.gpsCoordinates')}
            </span>
            {gpsCoords ? (
              <>
                <p className="font-bold text-white">
                  {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                </p>
                <p className="text-[10px] text-emerald-400">Lock: ±{gpsCoords.accuracy_meters.toFixed(1)}m precision</p>
              </>
            ) : (
              <p className="text-slate-500 italic">No GPS fix recorded</p>
            )}
          </div>

          {/* Timestamp & Lineage */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 flex items-center gap-1 text-[10px] uppercase font-bold">
              <Clock className="w-3 h-3 text-amber-400" />
              {t('form.timestamp')}
            </span>
            <p className="font-bold text-white">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            {parentRev && (
              <p className="text-[10px] text-amber-400 flex items-center gap-0.5">
                <Hash className="w-2.5 h-2.5" />
                <span>Base: {parentRev}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
