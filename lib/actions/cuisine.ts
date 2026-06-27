'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toBool,
  toIntOrNull,
  toJsonbArray,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const SPICE_VALUES = ['none', 'mild', 'medium', 'hot', 'eye_watering'] as const;

const FIELDS: Record<string, FieldDef> = {
  slug:                { column: 'slug' },
  name_en:             { column: 'name_en' },
  name_dz:             { column: 'name_dz' },
  name_romanized:      { column: 'name_romanized' },
  description:         { column: 'description' },
  short_summary:       { column: 'short_summary' },
  category_id:         { column: 'category_id', transform: toIntOrNull },
  spice_level:         { column: 'spice_level', cast: 'content.spice_level' },
  is_vegetarian:       { column: 'is_vegetarian',    transform: toBool },
  is_vegan:            { column: 'is_vegan',         transform: toBool },
  contains_dairy:      { column: 'contains_dairy',   transform: toBool },
  contains_pork:       { column: 'contains_pork',    transform: toBool },
  contains_beef:       { column: 'contains_beef',    transform: toBool },
  contains_chicken:    { column: 'contains_chicken', transform: toBool },
  contains_alcohol:    { column: 'contains_alcohol', transform: toBool },
  is_national_dish:    { column: 'is_national_dish', transform: toBool },
  is_ceremonial:       { column: 'is_ceremonial',    transform: toBool },
  preparation:         { column: 'preparation' },
  serving_notes:       { column: 'serving_notes' },
  typical_occasions:   { column: 'typical_occasions', cast: 'jsonb', transform: toJsonbArray },
  history:             { column: 'history' },
  folklore:            { column: 'folklore' },
  region_dzongkhag_id: { column: 'region_dzongkhag_id', transform: toIntOrNull },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();
const boolish    = z.union([z.boolean(), z.number(), z.string()]).optional();

// The DB enforces vegan => vegetarian AND no dairy/pork/beef/chicken via CHECK.
// Mirror it in zod so the user gets a friendlier error than the PG constraint.
const Schema = z.object({
  slug:           z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  name_en:        z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  description:    z.string().max(20_000).optional().nullable(),
  short_summary:  z.string().max(2_000).optional().nullable(),
  category_id:    refIdField,
  spice_level:    z.enum(SPICE_VALUES).optional(),
  is_vegetarian:    boolish,
  is_vegan:         boolish,
  contains_dairy:   boolish,
  contains_pork:    boolish,
  contains_beef:    boolish,
  contains_chicken: boolish,
  contains_alcohol: boolish,
  is_national_dish: boolish,
  is_ceremonial:    boolish,
  preparation:    z.string().max(20_000).optional().nullable(),
  serving_notes:  z.string().max(10_000).optional().nullable(),
  typical_occasions: z.string().max(5_000).optional().nullable(),
  history:        z.string().max(20_000).optional().nullable(),
  folklore:       z.string().max(20_000).optional().nullable(),
  region_dzongkhag_id: refIdField,
}).superRefine((val, ctx) => {
  const t = (v: unknown) => v === true || v === 1 || v === '1' || v === 'true';
  if (!t(val.is_vegan)) return;
  if (!t(val.is_vegetarian)) {
    ctx.addIssue({ code: 'custom', path: ['is_vegetarian'], message: 'Vegan dishes must also be vegetarian.' });
  }
  if (t(val.contains_dairy))   ctx.addIssue({ code: 'custom', path: ['contains_dairy'],   message: 'Vegan dishes cannot contain dairy.' });
  if (t(val.contains_pork))    ctx.addIssue({ code: 'custom', path: ['contains_pork'],    message: 'Vegan dishes cannot contain pork.' });
  if (t(val.contains_beef))    ctx.addIssue({ code: 'custom', path: ['contains_beef'],    message: 'Vegan dishes cannot contain beef.' });
  if (t(val.contains_chicken)) ctx.addIssue({ code: 'custom', path: ['contains_chicken'], message: 'Vegan dishes cannot contain chicken.' });
});

export async function updateCuisineItem(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'cuisine_item',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/food', `/food/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setCuisineItemStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'cuisine_item',
    id,
    newStatus,
    revalidate: ['/food', `/food/${id}`],
    expectedUpdatedAt,
  });
}

export async function createCuisineItem(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'cuisine_item',
    seed: { name_en: { value: `Untitled dish ${Date.now()}` } },
    revalidate: ['/food'],
  });
}

export async function deleteCuisineItem(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'cuisine_item',
    id,
    revalidate: ['/food'],
  });
}
