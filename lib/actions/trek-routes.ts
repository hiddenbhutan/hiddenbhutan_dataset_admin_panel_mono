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
  toJsonbArray,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


// content.trail_* enum values from the deploy scripts.
const TYPE_VALUES      = ['trek', 'hike', 'day_hike', 'pilgrimage', 'cultural_walk'] as const;
const CLASS_VALUES     = ['main', 'side', 'alternate', 'access'] as const;
const STATUS_VALUES    = ['open', 'seasonal', 'restricted', 'closed', 'unknown'] as const;
const DIFFICULTY_VALUES = ['easy', 'moderate', 'hard', 'extreme'] as const;

const FIELDS: Record<string, FieldDef> = {
  name:               { column: 'name_en' },
  name_dz:            { column: 'name_dz' },
  slug:               { column: 'slug' },
  summary:            { column: 'summary' },
  type:               { column: 'type',       cast: 'content.trail_type' },
  class:              { column: 'class',      cast: 'content.trail_class' },
  status:             { column: 'status',     cast: 'content.trail_status' },
  difficulty:         { column: 'difficulty', cast: 'content.trail_difficulty' },
  duration_days:      { column: 'duration_days',      transform: toIntOrNull },
  duration_hours_min: { column: 'duration_hours_min', transform: toFloatOrNull },
  duration_hours_max: { column: 'duration_hours_max', transform: toFloatOrNull },
  distance_km:        { column: 'distance_km',        transform: toFloatOrNull },
  season_start_month: { column: 'season_start_month', transform: toIntOrNull },
  season_end_month:   { column: 'season_end_month',   transform: toIntOrNull },
  season_open:        { column: 'season_notes' },
  permit_required:    { column: 'permit_required', transform: toBool },
  permit_type:        { column: 'permit_type' },
  permit_notes:       { column: 'permit_notes' },
  fee_currency:       { column: 'fee_currency' },
  fee_amount:         { column: 'fee_amount', transform: toFloatOrNull },
  description:        { column: 'description' },
  remarks:            { column: 'remarks' },
  highlights:         { column: 'highlights', cast: 'jsonb', transform: toJsonbArray },
};

const month = z.union([
  z.number().int().min(1).max(12),
  z.null(), z.undefined(), z.literal(''),
]).optional();

const Schema = z.object({
  name:            z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:         z.string().max(200).optional().nullable(),
  slug:            z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  summary:         z.string().max(500).optional().nullable(),
  type:            z.enum(TYPE_VALUES).optional().nullable(),
  class:           z.enum(CLASS_VALUES).optional().nullable(),
  status:          z.enum(STATUS_VALUES).optional().nullable(),
  difficulty:      z.enum(DIFFICULTY_VALUES).optional().nullable(),
  duration_days:   z.union([
                     z.number().int().min(1).max(60),
                     z.null(), z.undefined(), z.literal(''),
                   ]).optional(),
  duration_hours_min: z.union([z.number().min(0).max(48), z.null(), z.undefined(), z.literal('')]).optional(),
  duration_hours_max: z.union([z.number().min(0).max(48), z.null(), z.undefined(), z.literal('')]).optional(),
  distance_km:        z.union([z.number().min(0).max(5000), z.null(), z.undefined(), z.literal('')]).optional(),
  season_start_month: month,
  season_end_month:   month,
  season_open:        z.string().max(200).optional().nullable(),
  permit_required:    z.union([z.boolean(), z.number(), z.string()]).optional(),
  permit_type:        z.string().max(200).optional().nullable(),
  permit_notes:       z.string().max(2000).optional().nullable(),
  fee_currency:       z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 currency code (e.g. USD, BTN, INR)')
                       .optional().nullable(),
  fee_amount:         z.union([z.number().min(0), z.null(), z.undefined(), z.literal('')]).optional(),
  description:        z.string().max(40_000).optional().nullable(),
  remarks:            z.string().max(10_000).optional().nullable(),
  highlights:         z.string().max(20_000).optional().nullable(),
}).strip();

export async function updateTrekRoute(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'trek_route',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/routes', `/routes/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setTrekRouteStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'trek_route',
    id,
    newStatus,
    revalidate: ['/routes', `/routes/${id}`],
    expectedUpdatedAt,
  });
}

// Tiny placeholder MultiLineString near Thimphu. Real routes are normally ingested from GPX.
const PLACEHOLDER_GEOM =
  'SRID=4326;MULTILINESTRING((89.638 27.470, 89.640 27.472))';

export async function createTrekRoute(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'trek_route',
    seed: {
      name_en: { value: `Untitled route ${Date.now()}` },
      geom: { value: PLACEHOLDER_GEOM, cast: 'geometry' },
    },
    revalidate: ['/routes'],
  });
}

export async function deleteTrekRoute(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'trek_route',
    id,
    revalidate: ['/routes'],
  });
}

/**
 * Link a waypoint to a route by inserting into content.route_waypoint.
 * Auto-assigns the next sequence_order (max+1) so the waypoint appends to the
 * end of the canonical ordering. The user can re-order later by editing the
 * sequence_order column directly in the route_waypoint table (UI for that is
 * not yet wired here — adds get the last slot for now).
 */
export async function linkWaypointToRoute(
  routeId: number,
  waypointId: number,
): Promise<{ ok: boolean; message?: string; sequence_order?: number }> {
  const { pool } = await import('./_shared');
  if (!Number.isFinite(routeId) || routeId <= 0)       return { ok: false, message: 'Invalid route id' };
  if (!Number.isFinite(waypointId) || waypointId <= 0) return { ok: false, message: 'Invalid waypoint id' };
  try {
    const next = await pool().query<{ next_seq: number }>(
      `SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next_seq
         FROM content.route_waypoint
        WHERE route_id = $1`,
      [routeId],
    );
    const seq = next.rows[0]?.next_seq ?? 1;
    const r = await pool().query<{ sequence_order: number }>(
      `INSERT INTO content.route_waypoint (route_id, waypoint_id, sequence_order)
       VALUES ($1, $2, $3)
       RETURNING sequence_order`,
      [routeId, waypointId, seq],
    );
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/routes/${routeId}`);
    revalidatePath('/waypoints');
    return { ok: true, sequence_order: r.rows[0]?.sequence_order };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate key value/i.test(msg)) {
      return { ok: false, message: 'Already linked to this route.' };
    }
    return { ok: false, message: `Link failed: ${msg}` };
  }
}
