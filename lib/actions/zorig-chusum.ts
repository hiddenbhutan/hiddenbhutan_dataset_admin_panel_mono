'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  toJsonbArray,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const FIELDS: Record<string, FieldDef> = {
  slug:            { column: 'slug' },
  ordinal:         { column: 'ordinal', transform: toIntOrNull },
  name_en:         { column: 'name_en' },
  name_dz:         { column: 'name_dz' },
  name_romanized:  { column: 'name_romanized' },
  short_summary:   { column: 'short_summary' },
  description:     { column: 'description' },
  history:         { column: 'history' },
  tools:           { column: 'tools' },
  masters:         { column: 'masters',         cast: 'jsonb', transform: toJsonbArray },
  where_practiced: { column: 'where_practiced', cast: 'jsonb', transform: toJsonbArray },
};

const Schema = z.object({
  slug:           z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  ordinal:        z.union([z.number().int().min(1).max(13), z.null(), z.undefined(), z.literal('')]).optional(),
  name_en:        z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  short_summary:  z.string().max(2000).optional().nullable(),
  description:    z.string().max(20_000).optional().nullable(),
  history:        z.string().max(20_000).optional().nullable(),
  tools:          z.string().max(10_000).optional().nullable(),
  masters:        z.string().max(20_000).optional().nullable(),
  where_practiced: z.string().max(20_000).optional().nullable(),
}).strip();

export async function updateZorigChusum(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'zorig_chusum',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/zorig-chusum', `/zorig-chusum/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setZorigChusumStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'zorig_chusum',
    id,
    newStatus,
    revalidate: ['/zorig-chusum', `/zorig-chusum/${id}`],
    expectedUpdatedAt,
  });
}

export async function createZorigChusum(): Promise<InsertResult> {
  // ordinal is NOT NULL UNIQUE with CHECK(1..13). Find the first gap.
  const { pool } = await import('./_shared');
  const r = await pool().query<{ next_ordinal: number | null }>(`
    SELECT MIN(o)::int AS next_ordinal FROM generate_series(1, 13) o
    WHERE o NOT IN (SELECT ordinal FROM content.zorig_chusum)
  `);
  const nextOrdinal = r.rows[0]?.next_ordinal;
  if (!nextOrdinal) {
    return { ok: false, message: 'All 13 ordinals are taken — delete one first.' };
  }
  return insertDraft({
    schema: 'content',
    table: 'zorig_chusum',
    seed: {
      name_en: { value: `Untitled craft ${nextOrdinal}` },
      ordinal: { value: nextOrdinal },
    },
    revalidate: ['/zorig-chusum'],
  });
}

export async function deleteZorigChusum(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'zorig_chusum',
    id,
    revalidate: ['/zorig-chusum'],
  });
}
