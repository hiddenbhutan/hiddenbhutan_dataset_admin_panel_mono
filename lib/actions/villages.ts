'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  toFloatOrNull,
  toBool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';

const LOCALITY_KINDS = [
  'village', 'hamlet', 'settlement', 'town', 'thromde',
  'peak', 'pass', 'ridge', 'valley', 'meadow', 'glacier',
  'lake', 'river', 'river_confluence', 'waterfall', 'spring',
  'cave', 'cliff', 'sacred_site', 'landmark', 'other',
] as const;

const FIELDS: Record<string, FieldDef> = {
  name_en:             { column: 'name_en' },
  name_dz:             { column: 'name_dz' },
  name_romanized:      { column: 'name_romanized' },
  name_meaning:        { column: 'name_meaning' },
  kind:                { column: 'kind', cast: 'content.locality_kind' },
  source_feature_type: { column: 'source_feature_type' },
  description:         { column: 'description' },
  elevation_m:         { column: 'elevation_m',         transform: toFloatOrNull },
  dzongkhag_id:        { column: 'dzongkhag_id',        transform: toIntOrNull },
  gewog_id:            { column: 'gewog_id',            transform: toIntOrNull },
  chiwog_id:           { column: 'chiwog_id',           transform: toIntOrNull },
  population_male:     { column: 'population_male',     transform: toIntOrNull },
  population_female:   { column: 'population_female',   transform: toIntOrNull },
  population_total:    { column: 'population_total',    transform: toIntOrNull },
  population_year:     { column: 'population_year',     transform: toIntOrNull },
  has_accommodation:   { column: 'has_accommodation',   transform: (v) => v == null || v === '' ? null : toBool(v) },
  accommodation_notes: { column: 'accommodation_notes' },
  has_food_supply:     { column: 'has_food_supply',     transform: (v) => v == null || v === '' ? null : toBool(v) },
  has_phone_signal:    { column: 'has_phone_signal',    transform: (v) => v == null || v === '' ? null : toBool(v) },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();
const popField   = z.union([z.number().int().min(0).max(1_000_000), z.null(), z.undefined(), z.literal('')]).optional();
const triBool    = z.union([z.boolean(), z.number(), z.string(), z.null()]).optional();

const Schema = z.object({
  name_en:             z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:             z.string().max(200).optional().nullable(),
  name_romanized:      z.string().max(200).optional().nullable(),
  name_meaning:        z.string().max(2000).optional().nullable(),
  kind:                z.enum(LOCALITY_KINDS).optional(),
  source_feature_type: z.string().max(200).optional().nullable(),
  description:         z.string().max(20_000).optional().nullable(),
  elevation_m:         z.union([z.number().min(-500).max(10_000), z.null(), z.undefined(), z.literal('')]).optional(),
  dzongkhag_id:        refIdField,
  gewog_id:            refIdField,
  chiwog_id:           refIdField,
  population_male:     popField,
  population_female:   popField,
  population_total:    popField,
  population_year:     z.union([z.number().int().min(1900).max(2100), z.null(), z.undefined(), z.literal('')]).optional(),
  has_accommodation:   triBool,
  accommodation_notes: z.string().max(2000).optional().nullable(),
  has_food_supply:     triBool,
  has_phone_signal:    triBool,
}).strip();

export async function updateLocality(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'locality',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/villages', `/villages/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setLocalityStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'locality',
    id,
    newStatus,
    revalidate: ['/villages', `/villages/${id}`],
    expectedUpdatedAt,
  });
}

/** Create a draft village (locality with kind='village'). */
export async function createVillage(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'locality',
    seed: {
      name_en: { value: `Untitled village ${Date.now()}` },
      kind: { value: 'village', cast: 'content.locality_kind' },
      geom: { value: 'SRID=4326;POINT(89.6390 27.4716)', cast: 'geometry' },
    },
    revalidate: ['/villages'],
  });
}

export async function deleteLocality(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'locality',
    id,
    revalidate: ['/villages'],
  });
}
