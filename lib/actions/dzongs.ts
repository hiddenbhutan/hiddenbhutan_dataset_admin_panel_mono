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


const DZONG_TYPES = ['administrative_dzong', 'monastic_dzong', 'ta_dzong', 'historical_dzong', 'other'] as const;

const FIELDS: Record<string, FieldDef> = {
  name:                  { column: 'name_en' },
  name_dz:               { column: 'name_dz' },
  name_romanized:        { column: 'name_romanized' },
  slug:                  { column: 'slug' },
  description:           { column: 'description' },
  significance:          { column: 'significance' },
  visitor_info:          { column: 'visitor_info' },
  type:                  { column: 'dzong_type',          cast: 'content.dzong_type' },
  built_year:            { column: 'built_year',          transform: toIntOrNull },
  built_year_approx:     { column: 'built_year_approx',   transform: toIntOrNull },
  period_id:             { column: 'period_id',           transform: toIntOrNull },
  founder_figure_id:     { column: 'founder_figure_id',   transform: toIntOrNull },
  heritage_site_id:      { column: 'heritage_site_id',    transform: toIntOrNull },
  conservation_status:   { column: 'conservation_status', cast: 'content.conservation_status' },
  access_status:         { column: 'access_status',       cast: 'content.access_status' },
  is_current_admin_seat: { column: 'is_current_admin_seat', transform: toBool },
  houses_monk_body:      { column: 'houses_monk_body',      transform: toBool },
  monk_body_capacity:    { column: 'monk_body_capacity',    transform: toIntOrNull },
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
  type:           z.enum(DZONG_TYPES).optional().nullable(),
  built_year:        yearField,
  built_year_approx: yearField,
  period_id:         refIdField,
  founder_figure_id: refIdField,
  heritage_site_id:  refIdField,
  conservation_status: z.enum([
    'registered_protected', 'registered_unprotected', 'unregistered',
    'restored', 'ruins', 'lost', 'unknown',
  ]).optional().nullable(),
  access_status:        z.enum(['open', 'restricted', 'closed', 'unknown']).optional().nullable(),
  is_current_admin_seat: z.union([z.boolean(), z.number(), z.string()]).optional(),
  houses_monk_body:      z.union([z.boolean(), z.number(), z.string()]).optional(),
  monk_body_capacity:    z.union([z.number().int().min(0).max(10_000), z.null(), z.undefined(), z.literal('')]).optional(),
}).strip();

export async function updateDzong(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'dzong',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/dzongs', `/dzongs/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setDzongStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'dzong',
    id,
    newStatus,
    revalidate: ['/dzongs', `/dzongs/${id}`],
    expectedUpdatedAt,
  });
}

export async function createDzong(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'dzong',
    seed: {
      name_en: { value: `Untitled dzong ${Date.now()}` },
      geom: { value: 'SRID=4326;POINT(89.6390 27.4716)', cast: 'geometry' },
    },
    revalidate: ['/dzongs'],
  });
}

export async function deleteDzong(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'dzong',
    id,
    revalidate: ['/dzongs'],
  });
}
