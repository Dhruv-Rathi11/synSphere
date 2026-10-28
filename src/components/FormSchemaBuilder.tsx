import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FormSchema, type SchemaField, type FieldType, DEFAULT_SCHEMAS } from '../db/schema';
import { saveSchema, deleteSchema, exportSchemaToJson, importSchemaFromJson } from '../engine/schemaStore';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { useTranslation } from '../i18n';
import {
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  Eye,
  FileCode,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

const FIELD_TYPES: { type: FieldType; label: string; desc: string }[] = [
  { type: 'text', label: 'Short Text', desc: 'Single-line string for names, tags, codes' },
  { type: 'number', label: 'Numeric Value', desc: 'Integers, floats, measurements' },
  { type: 'select', label: 'Dropdown Select', desc: 'Single-choice option list' },
  { type: 'date', label: 'Date Picker', desc: 'Calendar date selection' },
  { type: 'location', label: 'GPS Geolocation', desc: 'Latitude, longitude, accuracy fix' },
  { type: 'textarea', label: 'Long Text / Notes', desc: 'Multi-line descriptions or logs' },
  { type: 'boolean', label: 'Boolean Toggle', desc: 'Yes/No binary flag' }
];

export const FormSchemaBuilder: React.FC = () => {
  const { t } = useTranslation();

  // Load schemas from Dexie
  const schemas = useLiveQuery<FormSchema[]>(() => db.schemas.toArray()) ?? DEFAULT_SCHEMAS;

  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('rural_health');
  const [activeSchema, setActiveSchema] = useState<FormSchema>(DEFAULT_SCHEMAS[0]);

  // Mode: 'visual' | 'json' | 'preview'
  const [activeMode, setActiveMode] = useState<'visual' | 'json' | 'preview'>('visual');
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    const found = schemas.find((s) => s.id === selectedSchemaId);
    if (found) {
      setActiveSchema(found);
      setRawJsonText(exportSchemaToJson(found));
    }
  }, [selectedSchemaId, schemas]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateNewSchema = () => {
    const newId = `schema_${Date.now().toString(36)}`;
    const freshSchema: FormSchema = {
      id: newId,
      title: 'New Custom Data Form',
      description: 'Custom offline field data collection schema.',
      version: '1.0',
      icon: 'FileText',
      category: 'Custom Forms',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: [
        {
          id: `f_${Date.now().toString(36)}_1`,
          name: 'item_identifier',
          label: 'Item / Record Title',
          type: 'text',
          required: true,
          placeholder: 'e.g. Asset #001'
        },
        {
          id: `f_${Date.now().toString(36)}_2`,
          name: 'operational_status',
          label: 'Status Code',
          type: 'select',
          required: true,
          options: ['Active', 'Pending', 'Flagged', 'Archived'],
          defaultValue: 'Active'
        }
      ]
    };

    setActiveSchema(freshSchema);
    setSelectedSchemaId(newId);
    setRawJsonText(exportSchemaToJson(freshSchema));
    showToast('New schema initialized! Add fields and save to persist in IndexedDB.');
  };

  const handleAddField = () => {
    const newFieldId = `f_${Date.now().toString(36)}`;
    const newField: SchemaField = {
      id: newFieldId,
      name: `field_${activeSchema.fields.length + 1}`,
      label: `Field ${activeSchema.fields.length + 1}`,
      type: 'text',
      required: false,
      placeholder: ''
    };

    const updated = {
      ...activeSchema,
      fields: [...activeSchema.fields, newField],
      updatedAt: new Date().toISOString()
    };
    setActiveSchema(updated);
    setRawJsonText(exportSchemaToJson(updated));
  };

  const handleUpdateField = (fieldId: string, patch: Partial<SchemaField>) => {
    const updatedFields = activeSchema.fields.map((f) => {
      if (f.id === fieldId) {
        return { ...f, ...patch };
      }
      return f;
    });

    const updated = {
      ...activeSchema,
      fields: updatedFields,
      updatedAt: new Date().toISOString()
    };
    setActiveSchema(updated);
    setRawJsonText(exportSchemaToJson(updated));
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedFields = activeSchema.fields.filter((f) => f.id !== fieldId);
    const updated = {
      ...activeSchema,
      fields: updatedFields,
      updatedAt: new Date().toISOString()
    };
    setActiveSchema(updated);
    setRawJsonText(exportSchemaToJson(updated));
  };

  const handleSaveToIndexedDb = async () => {
    try {
      await saveSchema(activeSchema);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      showToast(`Schema "${activeSchema.title}" saved to IndexedDB! Works offline immediately.`);
    } catch (e) {
      console.error('Failed to save schema:', e);
      showToast('Error saving schema to IndexedDB.');
    }
  };

  const handleDeleteCurrentSchema = async () => {
    if (confirm(`Are you sure you want to delete schema "${activeSchema.title}"?`)) {
      await deleteSchema(activeSchema.id);
      showToast('Schema deleted.');
      const remaining = schemas.filter((s) => s.id !== activeSchema.id);
      if (remaining.length > 0) {
        setSelectedSchemaId(remaining[0].id);
      }
    }
  };

  const handleApplyJson = () => {
    try {
      setJsonError(null);
      const parsed = importSchemaFromJson(rawJsonText);
      setActiveSchema(parsed);
      setSelectedSchemaId(parsed.id);
      showToast('JSON schema parsed and loaded successfully!');
    } catch (err: any) {
      setJsonError(err?.message || 'Invalid JSON syntax');
    }
  };

  const handleExportJsonDownload = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportSchemaToJson(activeSchema));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeSchema.id}_schema.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Schema downloaded as JSON file.');
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportSchemaToJson(activeSchema));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Studio Header */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-sky-500/25 bg-slate-900/90 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-sky-500/20 to-purple-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white font-mono">{t('schemaBuilder.title')}</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  Universal Schema Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t('schemaBuilder.subtitle')}</p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={handleCreateNewSchema}
              className="px-3.5 py-2 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/15"
            >
              <Plus className="w-4 h-4" />
              <span>{t('schemaBuilder.createNew')}</span>
            </button>

            <button
              onClick={handleSaveToIndexedDb}
              className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
            >
              <Save className="w-4 h-4" />
              <span>{t('schemaBuilder.saveSchema')}</span>
            </button>
          </div>
        </div>

        {/* Schema Switcher & Mode Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Schema Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {schemas.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSchemaId(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap cursor-pointer transition-all border ${
                  selectedSchemaId === s.id
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white'
                }`}
              >
                {s.title.split(' ')[0]} (v{s.version})
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs shrink-0">
            <button
              onClick={() => setActiveMode('visual')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeMode === 'visual' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Visual Builder
            </button>
            <button
              onClick={() => setActiveMode('json')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'json' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON Schema</span>
            </button>
            <button
              onClick={() => setActiveMode('preview')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'preview' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Form</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* MODE 1: VISUAL SCHEMA BUILDER */}
      {activeMode === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Schema Metadata Card (4 Cols) */}
          <div className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/90 space-y-4 font-mono text-xs shadow-xl">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Schema Metadata
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  {t('schemaBuilder.schemaName')}
                </label>
                <input
                  type="text"
                  value={activeSchema.title}
                  onChange={(e) => setActiveSchema({ ...activeSchema, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:ring-2 focus:ring-sky-400 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Schema Unique ID (Slug)
                </label>
                <input
                  type="text"
                  value={activeSchema.id}
                  onChange={(e) => setActiveSchema({ ...activeSchema, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sky-300 font-mono text-xs focus:ring-2 focus:ring-sky-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    {t('schemaBuilder.version')}
                  </label>
                  <input
                    type="text"
                    value={activeSchema.version}
                    onChange={(e) => setActiveSchema({ ...activeSchema, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-sky-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={activeSchema.category}
                    onChange={(e) => setActiveSchema({ ...activeSchema, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-sky-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  {t('schemaBuilder.schemaDescription')}
                </label>
                <textarea
                  rows={3}
                  value={activeSchema.description}
                  onChange={(e) => setActiveSchema({ ...activeSchema, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-sans focus:ring-2 focus:ring-sky-400 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-500 text-[10px]">
                Created: {new Date(activeSchema.createdAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={handleDeleteCurrentSchema}
                className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Schema</span>
              </button>
            </div>
          </div>

          {/* Fields Editor List (8 Cols) */}
          <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/90 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  {t('schemaBuilder.fieldsList')} ({activeSchema.fields.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Configure types, validation requirements, and dropdown options.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddField}
                className="px-4 py-2 rounded-xl font-mono text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('schemaBuilder.addField')}</span>
              </button>
            </div>

            {/* List of Configured Fields */}
            <div className="space-y-4">
              {activeSchema.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 font-mono text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-bold text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white">{field.label || 'Untitled Field'}</span>
                      <code className="text-[11px] text-slate-400">({field.name})</code>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteField(field.id)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Delete Field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Field Configuration Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Display Label */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('schemaBuilder.fieldLabel')}
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          handleUpdateField(field.id, {
                            label: e.target.value,
                            name: field.name || e.target.value.toLowerCase().replace(/\s+/g, '_')
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>

                    {/* Field Key */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('schemaBuilder.fieldName')}
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          handleUpdateField(field.id, {
                            name: e.target.value.toLowerCase().replace(/\s+/g, '_')
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sky-300 font-mono text-xs outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>

                    {/* Field Type */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('schemaBuilder.fieldType')}
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FieldType })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-sky-400"
                      >
                        {FIELD_TYPES.map((ft) => (
                          <option key={ft.type} value={ft.type}>
                            {ft.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select Options Config */}
                  {field.type === 'select' && (
                    <div>
                      <label className="text-[10px] uppercase font-bold text-sky-300 block mb-1">
                        Dropdown Options (comma separated):
                      </label>
                      <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) =>
                          handleUpdateField(field.id, {
                            options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-sky-500/40 text-white text-xs outline-none focus:ring-1 focus:ring-sky-400 font-mono"
                      />
                    </div>
                  )}

                  {/* Placeholder & Required Checkbox */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                        placeholder={t('schemaBuilder.placeholder')}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs outline-none placeholder:text-slate-600"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700"
                      />
                      <span>{t('schemaBuilder.requiredField')}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: RAW JSON SCHEMA EDITOR */}
      {activeMode === 'json' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-slate-900/90 space-y-4 font-mono shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                Raw JSON Schema Definition
              </h3>
              <p className="text-xs text-slate-400">
                Directly edit, copy, export, or import schema definition JSON.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportJsonDownload}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON</span>
              </button>

              <button
                type="button"
                onClick={handleApplyJson}
                className="px-4 py-1.5 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/20"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parse & Apply JSON</span>
              </button>
            </div>
          </div>

          {jsonError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          <textarea
            rows={18}
            value={rawJsonText}
            onChange={(e) => setRawJsonText(e.target.value)}
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sky-300 text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      )}

      {/* MODE 3: LIVE FORM PREVIEW */}
      {activeMode === 'preview' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between font-mono text-xs">
            <span className="text-sky-300">
              Interactive Live Preview for Schema: <b>{activeSchema.title}</b>
            </span>
            <span className="text-slate-400">Values entered here will be buffered in Dexie outbox</span>
          </div>

          <DynamicFormRenderer schema={activeSchema} />
        </div>
      )}
    </div>
  );
};
