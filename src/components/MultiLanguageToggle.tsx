import React from 'react';
import { useTranslation } from '../i18n';
import { Languages } from 'lucide-react';

export const MultiLanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className={`flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-850 font-mono text-xs ${className}`}>
      <Languages className="w-3.5 h-3.5 text-sky-400 ml-1.5 mr-0.5 shrink-0" />
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'hi'
            ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
};
