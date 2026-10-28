import React from 'react';
import { type FieldDiffItem, type FormSchema } from '../db/schema';
import { formatFieldValue, computeGenericDiff } from '../engine/diffEngine';
import { useTranslation } from '../i18n';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';

export interface GenericDiffViewProps {
  dataA: Record<string, any>;
  dataB: Record<string, any>;
  baseData?: Record<string, any>;
  schema?: FormSchema;
  labelA?: string;
  labelB?: string;
  roleA?: string;
  roleB?: string;
  className?: string;
}

export const GenericDiffView: React.FC<GenericDiffViewProps> = ({
  dataA,
  dataB,
  baseData,
  schema,
  labelA = 'Version A (Committed Head)',
  labelB = 'Version B (Incoming Delta)',
  roleA,
  roleB,
  className = ''
}) => {
  const { t } = useTranslation();

  const diffResult = computeGenericDiff(dataA, dataB, baseData, schema);

  const getDivergenceBadge = (type: FieldDiffItem['divergence_type']) => {
    switch (type) {
      case 'IDENTICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            <span>{t('diffView.matching')}</span>
          </span>
        );
      case 'SUPPLEMENTARY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <PlusCircle className="w-3 h-3 text-emerald-400" />
            <span>{t('diffView.supplementary')}</span>
          </span>
        );
      case 'CONTRADICTORY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{t('diffView.contradictory')}</span>
          </span>
        );
    }
  };

  return (
    <div className={`space-y-4 font-mono ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            {t('diffView.title')}
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>
            {diffResult.conflicting_fields.length} Conflict{diffResult.conflicting_fields.length === 1 ? '' : 's'}
          </span>
          <span>•</span>
          <span>{diffResult.total_divergences} Divergence(s)</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl">
        {/* Table Column Headers */}
        <div className="grid grid-cols-12 gap-3 p-3.5 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-3">{t('diffView.fieldName')}</div>
          <div className="col-span-4 text-sky-300 flex items-center justify-between">
            <span>{labelA}</span>
            {roleA && <span className="text-[10px] font-normal text-slate-400">({roleA})</span>}
          </div>
          <div className="col-span-4 text-purple-300 flex items-center justify-between">
            <span>{labelB}</span>
            {roleB && <span className="text-[10px] font-normal text-slate-400">({roleB})</span>}
          </div>
          <div className="col-span-1 text-right">{t('diffView.status')}</div>
        </div>

        {/* Diff Rows */}
        <div className="divide-y divide-slate-850 text-xs">
          {diffResult.field_diffs.map((item) => {
            const isContradiction = item.divergence_type === 'CONTRADICTORY';
            const isSupplementary = item.divergence_type === 'SUPPLEMENTARY';

            return (
              <div
                key={item.field_name}
                className={`grid grid-cols-12 gap-3 p-3.5 items-center transition-colors ${
                  isContradiction
                    ? 'bg-rose-950/20 hover:bg-rose-950/30'
                    : isSupplementary
                    ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                    : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Field Label & Key */}
                <div className="col-span-3 space-y-0.5">
                  <span className="font-bold text-slate-200 block text-xs">
                    {item.field_label || item.field_name}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{item.field_name}</span>
                </div>

                {/* Value A */}
                <div className="col-span-4">
                  <div
                    className={`p-2 rounded-xl text-xs overflow-x-auto ${
                      isContradiction
                        ? 'bg-rose-900/30 border border-rose-500/40 text-rose-200 font-semibold'
                        : isSupplementary && item.value_a
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {formatFieldValue(item.value_a)}
                  </div>
                </div>

                {/* Value B */}
                <div className="col-span-4">
                  <div
                    className={`p-2 rounded-xl text-xs overflow-x-auto ${
                      isContradiction
                        ? 'bg-rose-900/30 border border-rose-500/40 text-rose-200 font-semibold'
                        : isSupplementary && item.value_b
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {formatFieldValue(item.value_b)}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="col-span-1 text-right flex justify-end">
                  {getDivergenceBadge(item.divergence_type)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
