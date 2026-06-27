'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  toBool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const STYLE_VALUES = [
  'religious_painted', 'religious_appliqué', 'religious_embroidered',
  'thongdrol', 'mandala', 'lineage_portrait', 'other',
] as const;

const FIELDS: Record<string, FieldDef> = {
  name:                      { column: 'name_en' },
  name_dz:                   { column: 'name_dz' },
  name_romanized:            { column: 'name_romanized' },
  slug:                      { column: 'slug' },
  style:                     { column: 'style', cast: 'content.thangka_style' },
  is_thongdrol:              { column: 'is_thongdrol', transform: toBool },
  depicts:                   { column: 'depicts' },
  iconographic_notes:        { column: 'iconographic_notes' },
  meaning:                   { column: 'meaning' },
  significance:              { column: 'significance' },
  folklore:                  { column: 'folklore' },
  height_cm:                 { column: 'height_cm', transform: toIntOrNull },
  width_cm:                  { column: 'width_cm',  transform: toIntOrNull },
  materials:                 { column: 'materials' },
  commissioned_year:         { column: 'commissioned_year', transform: toIntOrNull },
  commissioned_by_figure_id: { column: 'commissioned_by_figure_id', transform: toIntOrNull },
  artist_attribution:        { column: 'artist_attribution' },
  origin_dzong_id:           { column: 'origin_dzong_id',          transform: toIntOrNull },
  origin_heritage_site_id:   { column: 'origin_heritage_site_id',  transform: toIntOrNull },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();
const dimField   = z.union([z.number().int().min(1).max(100_000), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name:           z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  slug:           z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  style:          z.enum(STYLE_VALUES).optional(),
  is_thongdrol:   z.union([z.boolean(), z.number(), z.string()]).optional(),
  depicts:        z.string().max(2000).optional().nullable(),
  iconographic_notes: z.string().max(20_000).optional().nullable(),
  meaning:        z.string().max(20_000).optional().nullable(),
  significance:   z.string().max(20_000).optional().nullable(),
  folklore:       z.string().max(20_000).optional().nullable(),
  height_cm:      dimField,
  width_cm:       dimField,
  materials:      z.string().max(2000).optional().nullable(),
  commissioned_year: z.union([
    z.number().int().min(600).max(new Date().getFullYear()),
    z.null(), z.undefined(), z.literal(''),
  ]).optional(),
  commissioned_by_figure_id: refIdField,
  artist_attribution:        z.string().max(500).optional().nullable(),
  origin_dzong_id:           refIdField,
  origin_heritage_site_id:   refIdField,
}).strip();

export async function updateThangka(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'thangka',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/thangkas', `/thangkas/${id}`, '/festivals'],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setThangkaStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'thangka',
    id,
    newStatus,
    revalidate: ['/thangkas', `/thangkas/${id}`, '/festivals'],
    expectedUpdatedAt,
  });
}

export async function createThangka(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'thangka',
    seed: {
      name_en: { value: 'Untitled thangka' },
      // style defaults to 'religious_painted' per DDL.
    },
    revalidate: ['/thangkas'],
  });
}

export async function deleteThangka(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'thangka',
    id,
    revalidate: ['/thangkas', '/festivals'],
  });
}
