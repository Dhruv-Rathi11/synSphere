import React from 'react';
import { type SyncStatus } from '../db/schema';
import { useTranslation } from '../i18n';
import { CheckCircle2, HardDrive, AlertTriangle } from 'lucide-react';

export interface RecordStatusBadgeProps {
  status: SyncStatus;
  rev?: string;
  className?: string;
  showRev?: boolean;
}

export const RecordStatusBadge: React.FC<RecordStatusBadgeProps> = ({
  status,
  rev,
  className = '',
  showRev = true
}) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border transition-all ${
        status === 'synced'
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          : status === 'conflict'
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      } ${className}`}
    >
      {status === 'synced' && (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{t('recordStatus.synced')}</span>
        </>
      )}

      {status === 'local' && (
        <>
          <HardDrive className="w-3 h-3 text-amber-400 shrink-0" />
          <span>{t('recordStatus.savedLocally')}</span>
        </>
      )}

      {status === 'conflict' && (
        <>
          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{t('recordStatus.conflictNeedsReview')}</span>
        </>
      )}

      {showRev && rev && (
        <span className="text-[10px] opacity-75 font-normal pl-1 border-l border-current/30">
          {rev}
        </span>
      )}
    </span>
  );
};
