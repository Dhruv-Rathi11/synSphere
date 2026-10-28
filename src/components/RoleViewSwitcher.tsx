import React from 'react';
import { useTranslation } from '../i18n';
import { UserCheck, Shield } from 'lucide-react';

export type UserRole = 'worker' | 'supervisor';

export interface RoleViewSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

export const RoleViewSwitcher: React.FC<RoleViewSwitcherProps> = ({
  currentRole,
  onRoleChange,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <div className={`p-1 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-1 font-mono text-xs ${className}`}>
      {/* Field Worker Mode Button */}
      <button
        type="button"
        onClick={() => onRoleChange('worker')}
        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
          currentRole === 'worker'
            ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
        title={t('roles.fieldWorkerDesc')}
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Field Worker</span>
        <span className="sm:hidden">Worker</span>
      </button>

      {/* Supervisor Mode Button */}
      <button
        type="button"
        onClick={() => onRoleChange('supervisor')}
        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
          currentRole === 'supervisor'
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-md shadow-purple-500/20'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
        title={t('roles.supervisorDesc')}
      >
        <Shield className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Supervisor / Admin</span>
        <span className="sm:hidden">Admin</span>
      </button>
    </div>
  );
};
