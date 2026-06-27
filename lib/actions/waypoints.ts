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

const FIELDS: Record<string, FieldDef> = {
  name_en:          { column: 'name_en' },
  name_dz:          { column: 'name_dz' },
  description:      { column: 'description' },
  remarks:          { column: 'remarks' },
  waypoint_type_id: { column: 'waypoint_type_id', transform: toIntOrNull },
  elevation_m:      { column: 'elevation_m',      transform: toFloatOrNull },
  dzongkhag_id:     { column: 'dzongkhag_id',     transform: toIntOrNull },
  gewog_id:         { column: 'gewog_id',         transform: toIntOrNull },
  chiwog_id:        { column: 'chiwog_id',        transform: toIntOrNull },
  is_visible:       { column: 'is_visible',       transform: toBool },
  lon:              { column: 'geom', cast: 'geometry', transform: (v) => v },
  lat:              { column: 'geom', cast: 'geometry', transform: (v) => v },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name_en:          z.string().max(200).optional().nullable(),
  name_dz:          z.string().max(200).optional().nullable(),
  description:      z.string().max(20_000).optional().nullable(),
  remarks:          z.string().max(20_000).optional().nullable(),
  waypoint_type_id: refIdField,
  elevation_m:      z.union([z.number().min(-500).max(10_000), z.null(), z.undefined(), z.literal('')]).optional(),
  dzongkhag_id:     refIdField,
  gewog_id:         refIdField,
  chiwog_id:        refIdField,
  is_visible:       z.union([z.boolean(), z.number(), z.string()]).optional(),
  lon:              z.union([z.number().min(-180).max(180), z.null(), z.undefined(), z.literal('')]).optional(),
  lat:              z.union([z.number().min(-90).max(90),   z.null(), z.undefined(), z.literal('')]).optional(),
}).strip();

/**
 * Waypoint geom is a single PostGIS Point. The editor sends lon/lat separately;
 * this helper merges them into one `geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)`.
 */
export async function updateWaypoint(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  const lon = patch.lon as number | string | null | undefined;
  const lat = patch.lat as number | string | null | undefined;
  const merged: Record<string, unknown> = { ...patch };
  delete merged.lon;
  delete merged.lat;
  if (lon !== undefined || lat !== undefined) {
    if (lon == null || lat == null || lon === '' || lat === '') {
      return { ok: false, errors: { lon: 'Both longitude and latitude are required' } };
    }
    const fieldsWithGeom: Record<string, FieldDef> = {
      ...FIELDS,
      geom: {
        column: 'geom',
        cast: 'geometry',
        transform: () => `SRID=4326;POINT(${Number(lon)} ${Number(lat)})`,
      },
    };
    merged.geom = '__synthetic__';
    return applyPatch({
      schema: 'content',
      table: 'waypoint',
      id,
      fields: fieldsWithGeom,
      patch: merged,
      revalidate: ['/waypoints', `/waypoints/${id}`],
      expectedUpdatedAt,
      schemaValidator: Schema,
    });
  }
  return applyPatch({
    schema: 'content',
    table: 'waypoint',
    id,
    fields: FIELDS,
    patch: merged,
    revalidate: ['/waypoints', `/waypoints/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setWaypointStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'waypoint',
    id,
    newStatus,
    revalidate: ['/waypoints', `/waypoints/${id}`],
    expectedUpdatedAt,
  });
}

export async function createWaypoint(): Promise<InsertResult> {
  // waypoint_type_id is NOT NULL — seed with the first available type.
  const { pool } = await import('./_shared');
  const r = await pool().query<{ id: number }>(`SELECT id FROM ref.waypoint_type ORDER BY sort_order LIMIT 1`);
  const firstType = r.rows[0]?.id;
  if (!firstType) {
    return { ok: false, message: 'No waypoint types defined. Add one in /reference/waypoint-type first.' };
  }
  return insertDraft({
    schema: 'content',
    table: 'waypoint',
    seed: {
      name_en: { value: `Untitled waypoint ${Date.now()}` },
      waypoint_type_id: { value: firstType },
      geom: { value: 'SRID=4326;POINT(89.6390 27.4716)', cast: 'geometry' },
    },
    revalidate: ['/waypoints'],
  });
}

export async function deleteWaypoint(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'waypoint',
    id,
    revalidate: ['/waypoints'],
  });
}
