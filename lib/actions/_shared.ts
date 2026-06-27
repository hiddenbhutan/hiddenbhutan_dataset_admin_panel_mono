/**
 * Shared scaffolding for content-table server actions.
 *
 * Each entity defines a FIELDS whitelist (+ optional zod schema) + revalidate
 * paths and gets back a typed update + status-transition pair.
 *
 * Features baked in:
 *   - whitelist + cast + transform per column
 *   - zod schema validation with per-field error surfacing
 *   - optimistic locking via expectedUpdatedAt (stamps the WHERE clause)
 *   - status transition state machine shared across all entities
 */

import 'server-only';
import { Pool, types } from 'pg';
import { revalidatePath } from 'next/cache';
import { ZodSchema } from 'zod';
import { getCurrentAdminUser } from '../auth';

// Parse BIGINT (int8, OID 20) to a JS number — see the note in lib/db.ts. This
// pool is used by the write actions, which validate `id` as a finite number.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

let _pool: Pool | null = null;
export function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

export const ALLOWED_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const;
export type ContentStatus = typeof ALLOWED_STATUSES[number];

export const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft:     ['in_review', 'archived'],
  in_review: ['draft', 'published', 'archived'],
  published: ['in_review', 'archived'],
  archived:  ['draft'],
};

export interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  updatedAt?: string;
  contentStatus?: ContentStatus;
  conflict?: boolean;                          // true when optimistic-lock failed
}

export interface FieldDef {
  column: string;
  cast?: string;
  transform?: (v: unknown) => unknown;
}

export interface UpdateOpts {
  schema: string;
  table: string;
  id: number;
  fields: Record<string, FieldDef>;
  patch: Record<string, unknown>;
  revalidate: string[];
  /** ISO string. If set, UPDATE ... WHERE updated_at = $expected fails on conflict. */
  expectedUpdatedAt?: string;
  /** Optional zod schema. Validated AFTER `patch` is whitelisted. */
  schemaValidator?: ZodSchema<unknown>;
}

export async function applyPatch(opts: UpdateOpts): Promise<ActionResult> {
  if (!Number.isFinite(opts.id) || opts.id <= 0) {
    return { ok: false, message: 'Invalid id' };
  }

  // Whitelist the patch.
  const allowed: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(opts.patch)) {
    if (key in opts.fields) allowed[key] = raw;
  }

  // Optional zod validation on whitelisted patch.
  if (opts.schemaValidator) {
    const parsed = opts.schemaValidator.safeParse(allowed);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') || '_';
        errors[field] = issue.message;
      }
      return {
        ok: false,
        message: 'Validation failed',
        errors,
      };
    }
  }

  const user = await getCurrentAdminUser();

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, raw] of Object.entries(allowed)) {
    const def = opts.fields[key]!;
    const value = def.transform ? def.transform(raw) : raw;
    params.push(value);
    const placeholder = `$${params.length}`;
    const expr = def.cast ? `${placeholder}::${def.cast}` : placeholder;
    sets.push(`${def.column} = ${expr}`);
  }
  if (sets.length === 0) {
    return { ok: false, message: 'Nothing to update' };
  }

  params.push(user.id, opts.id);
  const idxUser = params.length - 1;
  const idxId = params.length;

  const whereParts = [`id = $${idxId}`];
  if (opts.expectedUpdatedAt) {
    params.push(opts.expectedUpdatedAt);
    // updated_at is timestamptz with microsecond precision, but the client's
    // token is serialized via JS toISOString() (millisecond precision). Compare
    // at millisecond granularity so the round-trip matches instead of spuriously
    // failing the optimistic lock.
    whereParts.push(`date_trunc('milliseconds', updated_at) = $${params.length}::timestamptz`);
  }

  const sql = `
    UPDATE ${opts.schema}.${opts.table}
       SET ${sets.join(', ')},
           updated_by = $${idxUser},
           updated_at = now()
     WHERE ${whereParts.join(' AND ')}
     RETURNING content_status::text AS content_status, updated_at
  `;
  try {
    const r = await pool().query(sql, params);
    if (!r.rows[0]) {
      // Either id not found OR optimistic-lock conflict.
      if (opts.expectedUpdatedAt) {
        return {
          ok: false,
          conflict: true,
          message: 'This row was edited by someone else. Reload to see the latest, then re-apply your changes.',
        };
      }
      return { ok: false, message: 'Row not found' };
    }
    opts.revalidate.forEach((p) => revalidatePath(p));
    return {
      ok: true,
      message: 'Saved',
      contentStatus: r.rows[0].content_status as ContentStatus,
      updatedAt: r.rows[0].updated_at?.toISOString?.() ?? r.rows[0].updated_at,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Save failed: ${msg}` };
  }
}

export interface TransitionOpts {
  schema: string;
  table: string;
  id: number;
  newStatus: ContentStatus;
  revalidate: string[];
  expectedUpdatedAt?: string;
}

export async function transitionStatus(opts: TransitionOpts): Promise<ActionResult> {
  if (!Number.isFinite(opts.id) || opts.id <= 0) {
    return { ok: false, message: 'Invalid id' };
  }
  if (!ALLOWED_STATUSES.includes(opts.newStatus)) {
    return { ok: false, message: `Invalid status ${opts.newStatus}` };
  }
  const user = await getCurrentAdminUser();
  const cur = await pool().query<{ content_status: ContentStatus; updated_at: Date }>(
    `SELECT content_status::text AS content_status, updated_at
       FROM ${opts.schema}.${opts.table} WHERE id = $1`,
    [opts.id],
  );
  if (!cur.rows[0]) return { ok: false, message: 'Row not found' };
  const current = cur.rows[0].content_status;
  if (current === opts.newStatus) return { ok: false, message: `Already ${opts.newStatus}` };
  if (!TRANSITIONS[current]?.includes(opts.newStatus)) {
    return { ok: false, message: `Cannot transition from ${current} to ${opts.newStatus}` };
  }

  const params: unknown[] = [opts.newStatus, user.id, opts.id];
  const whereParts = [`id = $3`];
  if (opts.expectedUpdatedAt) {
    params.push(opts.expectedUpdatedAt);
    // Millisecond-granularity compare — see the note in applyPatch.
    whereParts.push(`date_trunc('milliseconds', updated_at) = $${params.length}::timestamptz`);
  }

  const setPubAt = opts.newStatus === 'published'
    ? 'published_at = COALESCE(published_at, now()),'
    : '';
  const r = await pool().query(
    `UPDATE ${opts.schema}.${opts.table}
        SET content_status = $1::content.content_status,
            ${setPubAt}
            updated_by = $2,
            updated_at = now()
      WHERE ${whereParts.join(' AND ')}
      RETURNING content_status::text AS content_status, updated_at`,
    params,
  );
  if (!r.rows[0]) {
    if (opts.expectedUpdatedAt) {
      return {
        ok: false,
        conflict: true,
        message: 'Stale: row changed since you loaded it. Refresh and retry.',
      };
    }
    return { ok: false, message: 'Row not found' };
  }
  opts.revalidate.forEach((p) => revalidatePath(p));
  return {
    ok: true,
    message: `Status: ${opts.newStatus}`,
    contentStatus: r.rows[0].content_status as ContentStatus,
    updatedAt: r.rows[0].updated_at?.toISOString?.() ?? r.rows[0].updated_at,
  };
}

// ── insert (create draft) ───────────────────────────────────────────────────
//
// New content rows always start in `draft` status. The caller passes the
// required-non-null columns as a `seed` map; everything else uses table
// defaults. The shared helper stamps `created_by`/`updated_by` and returns the
// new id so the caller can immediately redirect to the editor.

export interface InsertOpts {
  schema: string;
  table: string;
  /** Required columns: name_en + any other NOT NULL field without a default. */
  seed: Record<string, { value: unknown; cast?: string }>;
  revalidate: string[];
}

export interface InsertResult {
  ok: boolean;
  id?: number;
  message?: string;
}

export async function insertDraft(opts: InsertOpts): Promise<InsertResult> {
  const user = await getCurrentAdminUser();
  const cols: string[] = [];
  const placeholders: string[] = [];
  const params: unknown[] = [];
  for (const [col, def] of Object.entries(opts.seed)) {
    params.push(def.value);
    cols.push(col);
    placeholders.push(def.cast ? `$${params.length}::${def.cast}` : `$${params.length}`);
  }
  // created_by / updated_by come last.
  params.push(user.id, user.id);
  const sql = `
    INSERT INTO ${opts.schema}.${opts.table}
      (${cols.join(', ')}, created_by, updated_by)
    VALUES (${placeholders.join(', ')}, $${params.length - 1}, $${params.length})
    RETURNING id
  `;
  try {
    const r = await pool().query(sql, params);
    if (!r.rows[0]) return { ok: false, message: 'Insert returned no row' };
    opts.revalidate.forEach((p) => revalidatePath(p));
    return { ok: true, id: r.rows[0].id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Create failed: ${msg}` };
  }
}

// ── delete ──────────────────────────────────────────────────────────────────
//
// Content rows can be deleted from any status. Published rows trigger a confirm
// in the UI but we trust the user; FK violations surface a friendly message.

export interface DeleteOpts {
  schema: string;
  table: string;
  id: number;
  revalidate: string[];
}

export interface DeleteResult {
  ok: boolean;
  message?: string;
  /** True when the row was held by an FK constraint (likely referenced elsewhere). */
  inUse?: boolean;
}

export async function deleteRecord(opts: DeleteOpts): Promise<DeleteResult> {
  if (!Number.isFinite(opts.id) || opts.id <= 0) {
    return { ok: false, message: 'Invalid id' };
  }
  // Authorize — same gate as updates.
  await getCurrentAdminUser();
  try {
    const r = await pool().query(
      `DELETE FROM ${opts.schema}.${opts.table} WHERE id = $1`,
      [opts.id],
    );
    if (r.rowCount === 0) return { ok: false, message: 'Row not found' };
    opts.revalidate.forEach((p) => revalidatePath(p));
    return { ok: true, message: 'Deleted' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/violates foreign key constraint/i.test(msg)) {
      return {
        ok: false,
        inUse: true,
        message: 'Cannot delete: this record is referenced by other entries. Archive it instead, or remove the references first.',
      };
    }
    return { ok: false, message: `Delete failed: ${msg}` };
  }
}

// ── shared transforms ───────────────────────────────────────────────────────
export const toIntOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export const toFloatOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return /^(1|t|true|yes)$/i.test(v);
  return false;
};

export const toJsonbArray = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const arr = String(v)
    .split(/\s+•\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return JSON.stringify(arr);
};
