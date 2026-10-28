import { db, type FormSchema, DEFAULT_SCHEMAS } from '../db/schema';

export async function getAllSchemas(): Promise<FormSchema[]> {
  try {
    const list = await db.schemas.toArray();
    if (list.length === 0) {
      await db.schemas.bulkAdd(DEFAULT_SCHEMAS);
      return DEFAULT_SCHEMAS;
    }
    return list;
  } catch (e) {
    console.warn('Error fetching schemas from IndexedDB:', e);
    return DEFAULT_SCHEMAS;
  }
}

export async function getSchemaById(id: string): Promise<FormSchema | undefined> {
  try {
    const schema = await db.schemas.get(id);
    if (!schema) {
      const fallback = DEFAULT_SCHEMAS.find((s) => s.id === id);
      return fallback;
    }
    return schema;
  } catch (e) {
    console.warn(`Error fetching schema ${id}:`, e);
    return DEFAULT_SCHEMAS.find((s) => s.id === id);
  }
}

export async function saveSchema(schema: FormSchema): Promise<string> {
  const updatedSchema: FormSchema = {
    ...schema,
    updatedAt: new Date().toISOString()
  };

  await db.schemas.put(updatedSchema);
  return updatedSchema.id;
}

export async function deleteSchema(id: string): Promise<void> {
  await db.schemas.delete(id);
}

export function exportSchemaToJson(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2);
}

export function importSchemaFromJson(jsonString: string): FormSchema {
  const parsed = JSON.parse(jsonString);
  if (!parsed.id || !parsed.title || !Array.isArray(parsed.fields)) {
    throw new Error('Invalid schema JSON structure. Expected id, title, and fields array.');
  }

  return {
    id: String(parsed.id).trim().toLowerCase().replace(/\s+/g, '_'),
    title: String(parsed.title),
    description: String(parsed.description || ''),
    version: String(parsed.version || '1.0'),
    icon: String(parsed.icon || 'FileText'),
    category: String(parsed.category || 'General'),
    fields: parsed.fields.map((f: any, idx: number) => ({
      id: f.id || `f_${idx + 1}`,
      name: f.name || `field_${idx + 1}`,
      label: f.label || f.name || `Field ${idx + 1}`,
      type: f.type || 'text',
      required: Boolean(f.required),
      placeholder: f.placeholder || '',
      options: Array.isArray(f.options) ? f.options : undefined,
      defaultValue: f.defaultValue,
      helpText: f.helpText || '',
      unit: f.unit || ''
    })),
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
