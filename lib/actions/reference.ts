'use server';

/**
 * Server actions for the small `ref.*` lookup tables.
 *
 * These editors share one pattern: a few text columns + sort_order + table-specific
 * boolean/enum/int flags. Each table gets `update`/`insert`/`delete` with a strict
 * whitelist of fields and a zod schema. All revalidate `/reference/<key>` plus any
 * pages that hydrate dropdowns from the table.
 */

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { pool } from './_shared';
import { getCurrentAdminUser } from '../auth';

export interface RefActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  id?: number;
}

const CODE_RE = /^[a-z][a-z0-9_]*$/;
const codeField = z.string().min(1, 'Code is required').max(64).regex(CODE_RE, 'Lowercase letters, digits, underscores (must start with a letter)');
const labelField = z.string().min(1, 'Label is required').max(200);

type FieldDef = { column: string; cast?: string; transform?: (v: unknown) => unknown };

interface RefTableSpec {
  schema: 'ref';
  table: string;
  /** Pages that hydrate from this lookup, so they show changes immediately. */
  revalidate: string[];
  fields: Record<string, FieldDef>;
  schema_validator: z.ZodTypeAny;
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return /^(1|t|true|yes)$/i.test(v);
  return false;
}

const SPECS: Record<string, RefTableSpec> = {
  waypoint_type: {
    schema: 'ref',
    table: 'waypoint_type',
    revalidate: ['/reference/waypoint-type', '/waypoints'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      description: { column: 'description' },
      category:    { column: 'category', cast: 'ref.waypoint_category' },
      icon:        { column: 'icon' },
      color:       { column: 'color' },
      min_zoom:    { column: 'min_zoom',  transform: toIntOrNull },
      show_in_app: { column: 'show_in_app', transform: toBool },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      category:    z.enum(['trail','water','landmark','facility','cultural','nature','infrastructure','safety']).optional(),
      icon:        z.string().max(64).optional().nullable(),
      color:       z.string().max(16).optional().nullable(),
      min_zoom:    z.union([z.number().int().min(0).max(22), z.null(), z.literal('')]).optional(),
      show_in_app: z.union([z.boolean(), z.number(), z.string()]).optional(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  heritage_type: {
    schema: 'ref',
    table: 'heritage_type',
    revalidate: ['/reference/heritage-type', '/heritage'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      description: { column: 'description' },
      icon:        { column: 'icon' },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      icon:        z.string().max(64).optional().nullable(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  historical_period: {
    schema: 'ref',
    table: 'historical_period',
    revalidate: ['/reference/historical-period', '/historical-figures', '/heritage'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      description: { column: 'description' },
      start_year:  { column: 'start_year', transform: toIntOrNull },
      end_year:    { column: 'end_year',   transform: toIntOrNull },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      start_year:  z.union([z.number().int().min(-2000).max(3000), z.null(), z.literal('')]).optional(),
      end_year:    z.union([z.number().int().min(-2000).max(3000), z.null(), z.literal('')]).optional(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  festival_type: {
    schema: 'ref',
    table: 'festival_type',
    revalidate: ['/reference/festival-type', '/festivals'],
    fields: {
      code:         { column: 'code' },
      label_en:     { column: 'label_en' },
      label_dz:     { column: 'label_dz' },
      description:  { column: 'description' },
      is_religious: { column: 'is_religious', transform: toBool },
      icon:         { column: 'icon' },
      sort_order:   { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:         codeField.optional(),
      label_en:     labelField.optional(),
      label_dz:     z.string().max(200).optional().nullable(),
      description:  z.string().max(2000).optional().nullable(),
      is_religious: z.union([z.boolean(), z.number(), z.string()]).optional(),
      icon:         z.string().max(64).optional().nullable(),
      sort_order:   z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  cuisine_category: {
    schema: 'ref',
    table: 'cuisine_category',
    revalidate: ['/reference/cuisine-category', '/food'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      description: { column: 'description' },
      icon:        { column: 'icon' },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      icon:        z.string().max(64).optional().nullable(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  health_service: {
    schema: 'ref',
    table: 'health_service',
    revalidate: ['/reference/health-service', '/health-centers'],
    fields: {
      code:         { column: 'code' },
      label_en:     { column: 'label_en' },
      label_dz:     { column: 'label_dz' },
      description:  { column: 'description' },
      is_emergency: { column: 'is_emergency', transform: toBool },
      sort_order:   { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:         codeField.optional(),
      label_en:     labelField.optional(),
      label_dz:     z.string().max(200).optional().nullable(),
      description:  z.string().max(2000).optional().nullable(),
      is_emergency: z.union([z.boolean(), z.number(), z.string()]).optional(),
      sort_order:   z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  health_center_type: {
    schema: 'ref',
    table: 'health_center_type',
    revalidate: ['/reference/health-center-type', '/health-centers'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      full_form:   { column: 'full_form' },
      description: { column: 'description' },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      full_form:   z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  conservation_status: {
    schema: 'ref',
    table: 'conservation_status',
    revalidate: ['/reference/conservation-status', '/species'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      full_form:   { column: 'full_form' },
      description: { column: 'description' },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      full_form:   z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  observation_category: {
    schema: 'ref',
    table: 'observation_category',
    revalidate: ['/reference/observation-category', '/species'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      full_form:   { column: 'full_form' },
      description: { column: 'description' },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      full_form:   z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  school_category: {
    schema: 'ref',
    table: 'school_category',
    revalidate: ['/reference/school-category', '/schools'],
    fields: {
      code:        { column: 'code' },
      label_en:    { column: 'label_en' },
      label_dz:    { column: 'label_dz' },
      full_form:   { column: 'full_form' },
      description: { column: 'description' },
      sort_order:  { column: 'sort_order', transform: toIntOrNull },
    },
    schema_validator: z.object({
      code:        codeField.optional(),
      label_en:    labelField.optional(),
      label_dz:    z.string().max(200).optional().nullable(),
      full_form:   z.string().max(200).optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      sort_order:  z.union([z.number().int(), z.null(), z.literal('')]).optional(),
    }).strip(),
  },

  dzongkhag: {
    schema: 'ref',
    table: 'dzongkhag',
    revalidate: ['/districts', '/villages', '/schools', '/health-centers', '/heritage', '/dzongs', '/festivals', '/food', '/poi'],
    fields: {
      code:    { column: 'code' },
      name_en: { column: 'name_en' },
      name_dz: { column: 'name_dz' },
      region:  { column: 'region', cast: 'ref.region' },
    },
    schema_validator: z.object({
      // dzongkhag.code is optional per schema (UNIQUE but nullable).
      code:    z.string().max(40).optional().nullable(),
      name_en: labelField.optional(),
      name_dz: z.string().max(200).optional().nullable(),
      region:  z.enum(['east', 'west', 'central', 'south']).optional().nullable(),
    }).strip(),
  },
};

export type RefTableKey = keyof typeof SPECS;
export const REF_TABLE_KEYS = Object.keys(SPECS) as RefTableKey[];

interface SetExpr { column: string; expr: string }
function buildAllowedAndParams(spec: RefTableSpec, patch: Record<string, unknown>) {
  const allowed: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(patch)) {
    if (key in spec.fields) allowed[key] = raw;
  }
  const sets: SetExpr[] = [];
  const params: unknown[] = [];
  for (const [key, raw] of Object.entries(allowed)) {
    const def = spec.fields[key]!;
    const value = def.transform ? def.transform(raw) : raw;
    params.push(value);
    const placeholder = `$${params.length}`;
    const expr = def.cast ? `${placeholder}::${def.cast}` : placeholder;
    sets.push({ column: def.column, expr });
  }
  return { allowed, sets, params };
}

async function authorize() {
  await getCurrentAdminUser();
}

function zodErrors(err: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of err.issues) {
    const field = issue.path.join('.') || '_';
    errors[field] = issue.message;
  }
  return errors;
}

export async function updateRefRow(
  tableKey: RefTableKey,
  id: number,
  patch: Record<string, unknown>,
): Promise<RefActionResult> {
  const spec = SPECS[tableKey];
  if (!spec) return { ok: false, message: `Unknown reference table: ${tableKey}` };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, message: 'Invalid id' };
  await authorize();
  const { allowed, sets, params } = buildAllowedAndParams(spec, patch);
  const parsed = spec.schema_validator.safeParse(allowed);
  if (!parsed.success) return { ok: false, message: 'Validation failed', errors: zodErrors(parsed.error) };
  if (sets.length === 0) return { ok: false, message: 'Nothing to update' };
  params.push(id);
  const sql = `UPDATE ${spec.schema}.${spec.table}
                  SET ${sets.map(s => `${s.column} = ${s.expr}`).join(', ')}
                WHERE id = $${params.length}
                RETURNING id`;
  try {
    const r = await pool().query(sql, params);
    if (!r.rows[0]) return { ok: false, message: 'Row not found' };
    spec.revalidate.forEach(p => revalidatePath(p));
    return { ok: true, id: r.rows[0].id };
  } catch (e) {
    return { ok: false, message: `Save failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function insertRefRow(
  tableKey: RefTableKey,
  patch: Record<string, unknown>,
): Promise<RefActionResult> {
  const spec = SPECS[tableKey];
  if (!spec) return { ok: false, message: `Unknown reference table: ${tableKey}` };
  await authorize();
  // dzongkhag uses `name_en` as the label column (no `label_en`); other tables use `label_en`.
  // dzongkhag.code is optional in the schema.
  if (tableKey === 'dzongkhag') {
    if (!patch.name_en) return { ok: false, errors: { name_en: 'Name is required' } };
  } else {
    if (!patch.code)     return { ok: false, errors: { code:     'Code is required' } };
    if (!patch.label_en) return { ok: false, errors: { label_en: 'Label is required' } };
  }
  // waypoint_type also requires category
  if (tableKey === 'waypoint_type' && !patch.category) {
    return { ok: false, errors: { category: 'Category is required' } };
  }
  const { allowed, sets, params } = buildAllowedAndParams(spec, patch);
  const parsed = spec.schema_validator.safeParse(allowed);
  if (!parsed.success) return { ok: false, message: 'Validation failed', errors: zodErrors(parsed.error) };
  if (sets.length === 0) return { ok: false, message: 'Nothing to insert' };
  const sql = `INSERT INTO ${spec.schema}.${spec.table}
                  (${sets.map(s => s.column).join(', ')})
                VALUES (${sets.map(s => s.expr).join(', ')})
                RETURNING id`;
  try {
    const r = await pool().query(sql, params);
    spec.revalidate.forEach(p => revalidatePath(p));
    return { ok: true, id: r.rows[0].id };
  } catch (e) {
    return { ok: false, message: `Insert failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function deleteRefRow(
  tableKey: RefTableKey,
  id: number,
): Promise<RefActionResult> {
  const spec = SPECS[tableKey];
  if (!spec) return { ok: false, message: `Unknown reference table: ${tableKey}` };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, message: 'Invalid id' };
  await authorize();
  try {
    const r = await pool().query(`DELETE FROM ${spec.schema}.${spec.table} WHERE id = $1`, [id]);
    if (r.rowCount === 0) return { ok: false, message: 'Row not found' };
    spec.revalidate.forEach(p => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // FK violation: row is in use
    if (/violates foreign key constraint/i.test(msg)) {
      return { ok: false, message: 'Cannot delete: this row is in use by other records.' };
    }
    return { ok: false, message: `Delete failed: ${msg}` };
  }
}
