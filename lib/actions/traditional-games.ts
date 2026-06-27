'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toBool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


/**
 * Convert {min,max} JSON to a PG int4range literal, or pass NULL.
 * Accepts either an object {min,max} or null/empty.
 */
const toInt4Range = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    if (!v.trim()) return null;
    // Trust pre-formatted ranges like '[2,30)'.
    if (v.startsWith('[') || v.startsWith('(')) return v;
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (typeof v !== 'object' || v === null) return null;
  const { min, max } = v as { min?: number; max?: number };
  if (min == null && max == null) return null;
  const lo = min != null ? `[${min}` : '(';
  const hi = max != null ? `${max}]` : ')';
  return `${lo},${hi}`;
};

const FIELDS: Record<string, FieldDef> = {
  slug:              { column: 'slug' },
  name_en:           { column: 'name_en' },
  name_dz:           { column: 'name_dz' },
  name_romanized:    { column: 'name_romanized' },
  description:       { column: 'description' },
  rules:             { column: 'rules' },
  history:           { column: 'history' },
  equipment:         { column: 'equipment' },
  season:            { column: 'season' },
  is_competitive:    { column: 'is_competitive',    transform: toBool },
  is_national_sport: { column: 'is_national_sport', transform: toBool },
  typical_players:   { column: 'typical_players', cast: 'int4range', transform: toInt4Range },
};

const Schema = z.object({
  slug:              z.string().max(200)
                       .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                       .optional().nullable(),
  name_en:           z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:           z.string().max(200).optional().nullable(),
  name_romanized:    z.string().max(200).optional().nullable(),
  description:       z.string().max(20_000).optional().nullable(),
  rules:             z.string().max(20_000).optional().nullable(),
  history:           z.string().max(20_000).optional().nullable(),
  equipment:         z.string().max(5_000).optional().nullable(),
  season:            z.string().max(500).optional().nullable(),
  is_competitive:    z.union([z.boolean(), z.number(), z.string()]).optional(),
  is_national_sport: z.union([z.boolean(), z.number(), z.string()]).optional(),
  typical_players:   z.union([
                       z.object({ min: z.number().int().min(1).optional().nullable(), max: z.number().int().min(1).optional().nullable() }),
                       z.string(),
                       z.null(), z.undefined(),
                     ]).optional(),
}).strip();

export async function updateTraditionalGame(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'traditional_game',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/traditional-games', `/traditional-games/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setTraditionalGameStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'traditional_game',
    id,
    newStatus,
    revalidate: ['/traditional-games', `/traditional-games/${id}`],
    expectedUpdatedAt,
  });
}

export async function createTraditionalGame(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'traditional_game',
    seed: { name_en: { value: `Untitled game ${Date.now()}` } },
    revalidate: ['/traditional-games'],
  });
}

export async function deleteTraditionalGame(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'traditional_game',
    id,
    revalidate: ['/traditional-games'],
  });
}
