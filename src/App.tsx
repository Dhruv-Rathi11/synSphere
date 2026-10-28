import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FormSchema, DEFAULT_SCHEMAS } from './db/schema';
import { NetworkProvider } from './components/NetworkManager';
import { LanguageProvider, useTranslation } from './i18n';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { MultiLanguageToggle } from './components/MultiLanguageToggle';
import { RoleViewSwitcher, type UserRole } from './components/RoleViewSwitcher';
import { DynamicFormRenderer } from './components/DynamicFormRenderer';
import { FormSchemaBuilder } from './components/FormSchemaBuilder';
import { ConflictInbox } from './components/ConflictInbox';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { RecordListView } from './components/RecordListView';
import { OutboxQueueList } from './components/OutboxQueueList';
import { DualWorkerSimulation } from './components/DualWorkerSimulation';
import { NetworkSimulatorBar } from './components/NetworkSimulatorBar';
import {
  Zap,
  Edit,
  Database,
  GitMerge,
  BarChart3,
  Layers,
  UploadCloud,
  CheckCircle2,
  ChevronDown,
  Activity,
  Shield,
  Cpu,
  Users,
  ClipboardCheck,
  FileText
} from 'lucide-react';

function SyncSphereCore() {
  const { t } = useTranslation();

  // Role state: 'worker' | 'supervisor'
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('syncsphere_role');
    return (saved === 'worker' || saved === 'supervisor') ? saved : 'worker';
  });

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('syncsphere_role', newRole);
    if (newRole === 'worker' && (activeTab === 'conflicts' || activeTab === 'schema' || activeTab === 'analytics')) {
      setActiveTab('form');
    }
  };

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'form' | 'records' | 'outbox' | 'conflicts' | 'schema' | 'analytics' | 'partition'
  >('form');

  // Loaded schemas from IndexedDB
  const schemas = useLiveQuery<FormSchema[]>(() => db.schemas.toArray()) ?? DEFAULT_SCHEMAS;
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('rural_health');
  const [isSchemaMenuOpen, setIsSchemaMenuOpen] = useState(false);

  const activeSchema = schemas.find((s) => s.id === selectedSchemaId) || schemas[0] || DEFAULT_SCHEMAS[0];

  // Outbox & Conflicts live counters for tab badges
  const pendingOutboxCount = useLiveQuery<number>(() =>
    db.outbox.filter((item) => !item.synced).count()
  ) ?? 0;

  const unresolvedConflictCount = useLiveQuery<number>(() =>
    db.conflicts.where({ status: 'PENDING_REVIEW' }).count()
  ) ?? 0;

  const getSchemaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Activity':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-sky-400" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'Users':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'ClipboardCheck':
        return <ClipboardCheck className="w-4 h-4 text-indigo-400" />;
      default:
        return <FileText className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-sky-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-sky-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-sky-400">
                <Zap className="w-5 h-5 fill-sky-400/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white m-0 font-mono">
                  {t('app.title')}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 hidden md:inline">
                  {t('app.badge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 hidden lg:block">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-xs">
            {/* Field Worker Primary Tabs */}
            {role === 'worker' ? (
              <>
                <button
                  onClick={() => setActiveTab('form')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'form'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('navigation.dataEntry')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'records'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{t('navigation.myRecords')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('outbox')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'outbox'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{t('navigation.outbox')}</span>
                  {pendingOutboxCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                      {pendingOutboxCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              /* Supervisor / Admin Tabs */
              <>
                <button
                  onClick={() => setActiveTab('conflicts')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all relative ${
                    activeTab === 'conflicts'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>{t('navigation.conflictInbox')}</span>
                  {unresolvedConflictCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                      {unresolvedConflictCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'schema'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('navigation.schemaBuilder')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{t('navigation.analytics')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'records'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Records</span>
                </button>

                <button
                  onClick={() => setActiveTab('partition')}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'partition'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulator</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Header Toolbar: Schema Switcher, Role View Switcher, i18n, Sync Chip */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Active Schema Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSchemaMenuOpen(!isSchemaMenuOpen)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 flex items-center gap-1.5 text-xs font-mono text-white transition-all cursor-pointer shadow-md"
              >
                {getSchemaIcon(activeSchema.icon)}
                <span className="hidden sm:inline font-bold text-sky-300">
                  {activeSchema.title.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSchemaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSchemaMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 space-y-1">
                  <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-400 uppercase font-bold">
                    <span>Active Form Schema</span>
                    <span className="text-sky-400">{schemas.length} Loaded</span>
                  </div>
                  {schemas.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSchemaId(s.id);
                        setIsSchemaMenuOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer border ${
                        selectedSchemaId === s.id
                          ? 'bg-sky-500/15 border-sky-400/50 text-white'
                          : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getSchemaIcon(s.icon)}
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{s.title}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{s.category} • v{s.version}</div>
                        </div>
                      </div>
                      {selectedSchemaId === s.id && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role View Switcher (Req 9) */}
            <RoleViewSwitcher currentRole={role} onRoleChange={handleRoleChange} />

            {/* Multi-Language Switcher (Req 11) */}
            <MultiLanguageToggle />

            {/* Real-time Sync Status Indicator (Req 2) */}
            <SyncStatusIndicator />
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="xl:hidden px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/60 bg-slate-950 font-mono text-xs">
          {role === 'worker' ? (
            <>
              <button
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'form' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Data Entry
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'records' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Records
              </button>
              <button
                onClick={() => setActiveTab('outbox')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'outbox' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Outbox ({pendingOutboxCount})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('conflicts')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'conflicts' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'
                }`}
              >
                Conflicts ({unresolvedConflictCount})
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'schema' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Schema Builder
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'analytics' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'records' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Records
              </button>
              <button
                onClick={() => setActiveTab('partition')}
                className={`px-3 py-1 rounded-lg whitespace-nowrap ${
                  activeTab === 'partition' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Simulator
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Prominent Network Simulator Bar (Req 2 & 10) */}
        <NetworkSimulatorBar />

        {/* Dynamic Form Entry Tab */}
        {activeTab === 'form' && (
          <DynamicFormRenderer
            schema={activeSchema}
            onRecordSaved={() => {
              // Stay on form or navigate if needed
            }}
          />
        )}

        {/* Records Archive Tab */}
        {activeTab === 'records' && <RecordListView />}

        {/* Outbox Queue Tab */}
        {activeTab === 'outbox' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <OutboxQueueList />
          </div>
        )}

        {/* Conflict Inbox Tab (Req 4) */}
        {activeTab === 'conflicts' && <ConflictInbox />}

        {/* Form Schema Builder Tab (Req 1) */}
        {activeTab === 'schema' && <FormSchemaBuilder />}

        {/* Generic Analytics Dashboard Tab (Req 12) */}
        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {/* Multi-node Partition Simulator Tab */}
        {activeTab === 'partition' && (
          <DualWorkerSimulation onNavigateToTriage={() => setActiveTab('conflicts')} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs font-mono text-slate-500">
        {t('app.footer')}
      </footer>
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <NetworkProvider defaultOnline={false}>
        <SyncSphereCore />
      </NetworkProvider>
    </LanguageProvider>
  );
}

export default App;
