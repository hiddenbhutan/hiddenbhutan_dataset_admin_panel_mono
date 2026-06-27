'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  pool,
  toIntOrNull,
  toFloatOrNull,
  toBool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';

const HC_STATUSES = [
  'operational', 'temporarily_closed', 'under_construction', 'permanently_closed', 'unknown',
] as const;

const FIELDS: Record<string, FieldDef> = {
  name_en:                { column: 'name_en' },
  name_dz:                { column: 'name_dz' },
  name_old:               { column: 'name_old' },
  description:            { column: 'description' },
  remarks:                { column: 'remarks' },
  type_id:                { column: 'type_id', transform: toIntOrNull },
  status:                 { column: 'status', cast: 'content.health_center_status' },
  beds:                   { column: 'beds',                  transform: toIntOrNull },
  year_established:       { column: 'year_established',      transform: toIntOrNull },
  elevation_m:            { column: 'elevation_m',           transform: toFloatOrNull },
  dzongkhag_id:           { column: 'dzongkhag_id',          transform: toIntOrNull },
  gewog_id:               { column: 'gewog_id',              transform: toIntOrNull },
  chiwog_id:              { column: 'chiwog_id',             transform: toIntOrNull },
  nearest_locality_id:    { column: 'nearest_locality_id',   transform: toIntOrNull },
  has_helipad:            { column: 'has_helipad',           transform: toBool },
  requires_4wd_access:    { column: 'requires_4wd_access',   transform: toBool },
  nearest_road_access_km: { column: 'nearest_road_access_km', transform: toFloatOrNull },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();
const yearField  = z.union([z.number().int().min(1800).max(new Date().getFullYear() + 5), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name_en:                z.string().min(1, 'Name is required').max(300).optional(),
  name_dz:                z.string().max(300).optional().nullable(),
  name_old:               z.string().max(300).optional().nullable(),
  description:            z.string().max(20_000).optional().nullable(),
  remarks:                z.string().max(10_000).optional().nullable(),
  type_id:                z.union([z.number().int().positive(), z.undefined()]).optional(),
  status:                 z.enum(HC_STATUSES).optional(),
  beds:                   z.union([z.number().int().min(0).max(10_000), z.null(), z.undefined(), z.literal('')]).optional(),
  year_established:       yearField,
  elevation_m:            z.union([z.number().min(-500).max(10_000), z.null(), z.undefined(), z.literal('')]).optional(),
  dzongkhag_id:           refIdField,
  gewog_id:               refIdField,
  chiwog_id:              refIdField,
  nearest_locality_id:    refIdField,
  has_helipad:            z.union([z.boolean(), z.number(), z.string()]).optional(),
  requires_4wd_access:    z.union([z.boolean(), z.number(), z.string()]).optional(),
  nearest_road_access_km: z.union([z.number().min(0).max(2000), z.null(), z.undefined(), z.literal('')]).optional(),
}).strip();

export async function updateHealthCenter(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'health_center',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/health-centers', `/health-centers/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setHealthCenterStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'health_center',
    id,
    newStatus,
    revalidate: ['/health-centers', `/health-centers/${id}`],
    expectedUpdatedAt,
  });
}

export async function createHealthCenter(): Promise<InsertResult> {
  // type_id is NOT NULL; seed new drafts as BHU II (the prior enum default).
  const r = await pool().query(`SELECT id FROM ref.health_center_type WHERE code = 'bhu_2'`);
  const typeId = r.rows[0]?.id as number | undefined;
  if (!typeId) return { ok: false, message: 'Default health center type (bhu_2) not found' };
  return insertDraft({
    schema: 'content',
    table: 'health_center',
    seed: {
      name_en: { value: `Untitled health center ${Date.now()}` },
      type_id: { value: typeId },
      geom:    { value: 'SRID=4326;POINT(89.6390 27.4716)', cast: 'geometry' },
    },
    revalidate: ['/health-centers'],
  });
}

export async function deleteHealthCenter(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'health_center',
    id,
    revalidate: ['/health-centers'],
  });
}
