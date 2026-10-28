import React, { useState } from 'react';
import { type FormSchema, type FieldDiffItem } from '../db/schema';
import { useTranslation } from '../i18n';
import {
  Edit3,
  Sparkles,
  RefreshCw,
  X,
  Save
} from 'lucide-react';

export interface ResolutionActionBarProps {
  onResolve: (decision: 'BRANCH_A' | 'BRANCH_B' | 'MERGE' | 'MANUAL', customData?: Record<string, any>) => Promise<void>;
  isResolving?: boolean;
  dataA: Record<string, any>;
  dataB: Record<string, any>;
  fieldDiffs?: FieldDiffItem[];
  schema?: FormSchema;
  className?: string;
}

export const ResolutionActionBar: React.FC<ResolutionActionBarProps> = ({
  onResolve,
  isResolving = false,
  dataA,
  dataB,
  fieldDiffs = [],
  schema,
  className = ''
}) => {
  const { t } = useTranslation();

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualFormData, setManualFormData] = useState<Record<string, any>>({});

  const handleOpenManualEdit = () => {
    // Initialize with composite merge or branch A values
    const initial: Record<string, any> = { ...dataA, ...dataB };
    for (const diff of fieldDiffs) {
      initial[diff.field_name] = diff.recommended_value;
    }
    setManualFormData(initial);
    setIsManualModalOpen(true);
  };

  const handleCommitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await onResolve('MANUAL', manualFormData);
    setIsManualModalOpen(false);
  };

  return (
    <>
      {/* Fixed 4-Button Action Bar */}
      <div
        className={`p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs ${className}`}
      >
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] hidden lg:inline">
          Resolution Strategy:
        </span>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Button 1: Keep Version A */}
          <button
            type="button"
            onClick={() => onResolve('BRANCH_A')}
            disabled={isResolving}
            className="px-4 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-sky-300 border border-sky-500/40 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{t('actions.keepVersionA')}</span>
          </button>

          {/* Button 2: Keep Version B */}
          <button
            type="button"
            onClick={() => onResolve('BRANCH_B')}
            disabled={isResolving}
            className="px-4 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-purple-300 border border-purple-500/40 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{t('actions.keepVersionB')}</span>
          </button>

          {/* Button 3: Accept AI Merge (Primary) */}
          <button
            type="button"
            onClick={() => onResolve('MERGE')}
            disabled={isResolving}
            className="col-span-2 sm:col-span-1 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isResolving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Sparkles className="w-4 h-4 text-slate-950" />
            )}
            <span>{t('actions.acceptAiMerge')}</span>
          </button>

          {/* Button 4: Manual Edit */}
          <button
            type="button"
            onClick={handleOpenManualEdit}
            disabled={isResolving}
            className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/40 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('actions.manualEdit')}</span>
          </button>
        </div>
      </div>

      {/* Manual Edit Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 font-mono shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Manual Field-by-Field Custom Merge</h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Customize the exact unified attributes to commit to the document head.
            </p>

            <form onSubmit={handleCommitManual} className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {Object.keys(manualFormData).map((key) => {
                  if (['updated_at', 'created_at', 'id', 'rev'].includes(key)) return null;

                  const schemaField = schema?.fields.find((f) => f.name === key);
                  const label = schemaField?.label || key.replace(/_/g, ' ').toUpperCase();
                  const val = manualFormData[key];

                  return (
                    <div key={key} className="space-y-1 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold text-slate-300">{label}</label>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setManualFormData({ ...manualFormData, [key]: dataA[key] })}
                            className="text-sky-400 hover:underline cursor-pointer"
                          >
                            Use Ver A
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => setManualFormData({ ...manualFormData, [key]: dataB[key] })}
                            className="text-purple-400 hover:underline cursor-pointer"
                          >
                            Use Ver B
                          </button>
                        </div>
                      </div>

                      {typeof val === 'string' && val.length > 50 ? (
                        <textarea
                          rows={2}
                          value={val || ''}
                          onChange={(e) => setManualFormData({ ...manualFormData, [key]: e.target.value })}
                          className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val !== undefined ? String(val) : ''}
                          onChange={(e) => setManualFormData({ ...manualFormData, [key]: e.target.value })}
                          className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('actions.saveCustomMerge')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
