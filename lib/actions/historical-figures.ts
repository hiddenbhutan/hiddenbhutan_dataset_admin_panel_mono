'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const FIELDS: Record<string, FieldDef> = {
  name:          { column: 'name_en' },
  name_dz:       { column: 'name_dz' },
  honorific:     { column: 'honorific' },
  role:          { column: 'role' },
  slug:          { column: 'slug' },
  period_id:     { column: 'period_id',  transform: toIntOrNull },
  birth_year:    { column: 'birth_year', transform: toIntOrNull },
  death_year:    { column: 'death_year', transform: toIntOrNull },
  short_bio:     { column: 'short_bio' },
  significance:  { column: 'significance' },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();
const yearField  = z.union([
  z.number().int().min(-2000).max(new Date().getFullYear() + 5),
  z.null(), z.undefined(), z.literal(''),
]).optional();

const Schema = z.object({
  name:         z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:      z.string().max(200).optional().nullable(),
  honorific:    z.string().max(200).optional().nullable(),
  role:         z.string().max(200).optional().nullable(),
  slug:         z.string().max(200)
                  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                  .optional().nullable(),
  period_id:    refIdField,
  birth_year:   yearField,
  death_year:   yearField,
  short_bio:    z.string().max(20_000).optional().nullable(),
  significance: z.string().max(20_000).optional().nullable(),
}).strip();

export async function updateHistoricalFigure(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'historical_figure',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/historical-figures', `/historical-figures/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setHistoricalFigureStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'historical_figure',
    id,
    newStatus,
    revalidate: ['/historical-figures', `/historical-figures/${id}`],
    expectedUpdatedAt,
  });
}

export async function createHistoricalFigure(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'historical_figure',
    seed: { name_en: { value: 'Untitled figure' } },
    revalidate: ['/historical-figures'],
  });
}

export async function deleteHistoricalFigure(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'historical_figure',
    id,
    revalidate: ['/historical-figures'],
  });
}
