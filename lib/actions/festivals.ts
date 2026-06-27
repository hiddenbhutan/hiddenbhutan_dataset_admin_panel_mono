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


const AUDIENCE_VALUES = ['open_to_all', 'tourists_welcome', 'locals_preferred', 'monastic_only', 'closed'] as const;

const FIELDS: Record<string, FieldDef> = {
  name:             { column: 'name_en' },
  name_dz:          { column: 'name_dz' },
  name_romanized:   { column: 'name_romanized' },
  name_local:       { column: 'name_local' },
  slug:             { column: 'slug' },
  description:      { column: 'description' },
  significance:     { column: 'significance' },
  history:          { column: 'history' },
  folklore:         { column: 'folklore' },
  festival_type_id: { column: 'festival_type_id', transform: toIntOrNull },
  lunar_month:      { column: 'lunar_month',      transform: toIntOrNull },
  lunar_day_start:  { column: 'lunar_day_start',  transform: toIntOrNull },
  lunar_day_end:    { column: 'lunar_day_end',    transform: toIntOrNull },
  duration_days:    { column: 'duration_days',    transform: toIntOrNull },
  dress_code:       { column: 'dress_code' },
  audience:         { column: 'audience',         cast: 'content.festival_audience' },
};

const monthField = z.union([
  z.number().int().min(1).max(12),
  z.null(), z.undefined(), z.literal(''),
]).optional();

const dayField = z.union([
  z.number().int().min(1).max(30),
  z.null(), z.undefined(), z.literal(''),
]).optional();

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name:           z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  name_local:     z.string().max(200).optional().nullable(),
  slug:           z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  description:    z.string().max(40_000).optional().nullable(),
  significance:   z.string().max(20_000).optional().nullable(),
  history:        z.string().max(40_000).optional().nullable(),
  folklore:       z.string().max(20_000).optional().nullable(),
  festival_type_id: refIdField,
  lunar_month:     monthField,
  lunar_day_start: dayField,
  lunar_day_end:   dayField,
  duration_days:   z.union([
                     z.number().int().min(1).max(30),
                     z.null(), z.undefined(), z.literal(''),
                   ]).optional(),
  dress_code:     z.string().max(2000).optional().nullable(),
  audience:       z.enum(AUDIENCE_VALUES).optional().nullable(),
}).strip();

export async function updateFestival(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'festival',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/festivals', `/festivals/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setFestivalStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'festival',
    id,
    newStatus,
    revalidate: ['/festivals', `/festivals/${id}`],
    expectedUpdatedAt,
  });
}

export async function createFestival(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'festival',
    seed: { name_en: { value: `Untitled festival ${Date.now()}` } },
    revalidate: ['/festivals'],
  });
}

export async function deleteFestival(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'festival',
    id,
    revalidate: ['/festivals'],
  });
}
