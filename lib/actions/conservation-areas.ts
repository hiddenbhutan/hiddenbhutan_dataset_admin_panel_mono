'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toBool,
  toFloatOrNull,
  toIntOrNull,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const PA_TYPE_VALUES = [
  'national_park', 'wildlife_sanctuary', 'strict_nature_reserve',
  'biological_corridor', 'ramsar_site', 'royal_botanical_park',
  'nature_reserve', 'other',
] as const;

const IUCN_CATEGORY_VALUES = ['Ia', 'Ib', 'II', 'III', 'IV', 'V', 'VI', 'not_assigned'] as const;

const ACCESS_STATUS_VALUES = ['open', 'restricted', 'closed', 'unknown'] as const;

const FIELDS: Record<string, FieldDef> = {
  slug:                 { column: 'slug' },
  code:                 { column: 'code' },
  pa_name:              { column: 'pa_name' },
  name_en:              { column: 'name_en' },
  name_dz:              { column: 'name_dz' },
  description:          { column: 'description' },
  key_species_notes:    { column: 'key_species_notes' },
  pa_type:              { column: 'pa_type',       cast: 'content.pa_type' },
  iucn_category:        { column: 'iucn_category', cast: 'content.iucn_category' },
  managing_authority:   { column: 'managing_authority' },
  established_year:     { column: 'established_year', transform: toIntOrNull },
  is_active:            { column: 'is_active',       transform: toBool },
  area_km2:             { column: 'area_km2',        transform: toFloatOrNull },
  area_ha:              { column: 'area_ha',         transform: toFloatOrNull },
  permit_required:      { column: 'permit_required', transform: toBool },
  permit_info:          { column: 'permit_info' },
  access_status:        { column: 'access_status',   cast: 'content.access_status' },
  visitor_regulations:  { column: 'visitor_regulations' },
};

const CURRENT_YEAR = new Date().getFullYear();

const Schema = z.object({
  slug:                 z.string().max(200)
                          .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                          .optional().nullable(),
  code:                 z.string().max(40).optional().nullable(),
  pa_name:              z.string().max(300).optional().nullable(),
  name_en:              z.string().min(1, 'Name is required').max(300).optional(),
  name_dz:              z.string().max(300).optional().nullable(),
  description:          z.string().max(40_000).optional().nullable(),
  key_species_notes:    z.string().max(20_000).optional().nullable(),
  pa_type:              z.enum(PA_TYPE_VALUES).optional(),
  iucn_category:        z.enum(IUCN_CATEGORY_VALUES).optional(),
  managing_authority:   z.string().max(200).optional().nullable(),
  established_year:     z.union([
                          z.number().int().min(1800).max(CURRENT_YEAR),
                          z.null(), z.undefined(), z.literal(''),
                        ]).optional(),
  is_active:            z.union([z.boolean(), z.number(), z.string()]).optional(),
  area_km2:             z.union([z.number().min(0).max(100_000), z.null(), z.undefined(), z.literal('')]).optional(),
  area_ha:              z.union([z.number().min(0).max(10_000_000), z.null(), z.undefined(), z.literal('')]).optional(),
  permit_required:      z.union([z.boolean(), z.number(), z.string()]).optional(),
  permit_info:          z.string().max(5_000).optional().nullable(),
  access_status:        z.enum(ACCESS_STATUS_VALUES).optional(),
  visitor_regulations:  z.string().max(20_000).optional().nullable(),
}).strip();

export async function updateConservationArea(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'conservation_area',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/conservation', '/corridors', `/conservation/${id}`, `/corridors/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setConservationAreaStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'conservation_area',
    id,
    newStatus,
    revalidate: ['/conservation', '/corridors', `/conservation/${id}`, `/corridors/${id}`],
    expectedUpdatedAt,
  });
}

// Tiny placeholder MultiPolygon near Thimphu — editor expects users to redraw via GIS workflow.
const PLACEHOLDER_GEOM =
  'SRID=4326;MULTIPOLYGON(((89.638 27.470, 89.640 27.470, 89.640 27.472, 89.638 27.472, 89.638 27.470)))';

export async function createConservationArea(paType: 'national_park'|'wildlife_sanctuary'|'strict_nature_reserve'|'biological_corridor'|'ramsar_site'|'royal_botanical_park'|'private_reserve'|'community_forest'|'other' = 'national_park'): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'conservation_area',
    seed: {
      name_en: { value: `Untitled area ${Date.now()}` },
      pa_type: { value: paType, cast: 'content.pa_type' },
      geom: { value: PLACEHOLDER_GEOM, cast: 'geometry' },
    },
    revalidate: ['/conservation', '/corridors'],
  });
}

export async function deleteConservationArea(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'conservation_area',
    id,
    revalidate: ['/conservation', '/corridors'],
  });
}
