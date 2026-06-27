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


const FIELDS: Record<string, FieldDef> = {
  name:                     { column: 'name_en' },
  name_dz:                  { column: 'name_dz' },
  name_romanized:           { column: 'name_romanized' },
  slug:                     { column: 'slug' },
  description:              { column: 'description' },
  significance:             { column: 'significance' },
  visitor_info:             { column: 'visitor_info' },
  built_year:               { column: 'built_year',        transform: toIntOrNull },
  built_year_approx:        { column: 'built_year_approx', transform: toIntOrNull },
  built_by:                 { column: 'built_by_text' },
  registered_id:            { column: 'registered_id' },
  conservation_status:      { column: 'conservation_status', cast: 'content.conservation_status' },
  access_status:            { column: 'access_status',       cast: 'content.access_status' },
  is_accessible_from_trail: { column: 'is_accessible_from_trail', transform: toBool },
  heritage_type_id:         { column: 'heritage_type_id',      transform: toIntOrNull },
  period_id:                { column: 'period_id',             transform: toIntOrNull },
  founder_figure_id:        { column: 'founder_figure_id',     transform: toIntOrNull },
  nearest_trek_route_id:    { column: 'nearest_trek_route_id', transform: toIntOrNull },
};

const CURRENT_YEAR = new Date().getFullYear();

const yearField = z.union([
  z.number().int().min(600, 'Year must be >= 600 CE')
    .max(CURRENT_YEAR, `Year cannot exceed ${CURRENT_YEAR}`),
  z.null(), z.undefined(), z.literal(''),
]).optional();

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name:           z.string().min(1, 'Name is required').max(200, 'Too long').optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  slug:           z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  description:    z.string().max(20_000, 'Too long').optional().nullable(),
  significance:   z.string().max(20_000, 'Too long').optional().nullable(),
  visitor_info:   z.string().max(20_000, 'Too long').optional().nullable(),
  built_year:        yearField,
  built_year_approx: yearField,
  built_by:       z.string().max(500).optional().nullable(),
  registered_id:  z.string().max(200).optional().nullable(),
  conservation_status: z.enum([
    'registered_protected', 'registered_unprotected', 'unregistered',
    'restored', 'ruins', 'lost', 'unknown',
  ]).optional().nullable(),
  access_status: z.enum(['open', 'restricted', 'closed', 'unknown']).optional().nullable(),
  is_accessible_from_trail: z.union([z.boolean(), z.number(), z.string()]).optional(),
  heritage_type_id:      refIdField,
  period_id:             refIdField,
  founder_figure_id:     refIdField,
  nearest_trek_route_id: refIdField,
}).strip();

export async function updateHeritageSite(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'heritage_site',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/heritage', `/heritage/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setHeritageSiteStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'heritage_site',
    id,
    newStatus,
    revalidate: ['/heritage', `/heritage/${id}`],
    expectedUpdatedAt,
  });
}

export async function createHeritageSite(): Promise<InsertResult> {
  // geom is NOT NULL — seed with Thimphu coords as a placeholder, editor can adjust.
  return insertDraft({
    schema: 'content',
    table: 'heritage_site',
    seed: {
      name_en: { value: `Untitled heritage site ${Date.now()}` },
      geom: { value: 'SRID=4326;POINT(89.6390 27.4716)', cast: 'geometry' },
    },
    revalidate: ['/heritage'],
  });
}

export async function deleteHeritageSite(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'heritage_site',
    id,
    revalidate: ['/heritage'],
  });
}
