'use server';

/**
 * Update only the geometry of a content row.
 *
 * Used by the map editors when the user drags a marker (Point) or draws a
 * Line/Polygon. The geom is supplied as GeoJSON; we cast via ST_GeomFromGeoJSON
 * and set SRID=4326. Bypasses the whitelisted `applyPatch` because most action
 * files don't include `geom` in their FIELDS map.
 */

import 'server-only';
import { revalidatePath } from 'next/cache';
import { pool } from './_shared';
import { getCurrentAdminUser } from '../auth';

export type GeomEntity =
  | 'trek_route'
  | 'waypoint'
  | 'heritage_site'
  | 'dzong'
  | 'conservation_area'
  | 'school'
  | 'health_center'
  | 'locality';

interface UpdateGeomArgs {
  entity: GeomEntity;
  id: number;
  /** GeoJSON Geometry — Point / LineString / MultiLineString / Polygon / MultiPolygon. */
  geom: { type: string; coordinates: unknown };
}

interface Result {
  ok: boolean;
  message?: string;
  updatedAt?: string;
}

/**
 * Map each entity to (table, expected geometry types for sanity check, revalidate paths).
 */
const ENTITY_SPEC: Record<GeomEntity, { table: string; expected: string[]; revalidate: string[] }> = {
  trek_route:        { table: 'content.trek_route',        expected: ['MultiLineString', 'LineString'], revalidate: ['/routes'] },
  waypoint:          { table: 'content.waypoint',          expected: ['Point'],                          revalidate: ['/waypoints'] },
  heritage_site:     { table: 'content.heritage_site',     expected: ['Point'],                          revalidate: ['/heritage'] },
  dzong:             { table: 'content.dzong',             expected: ['Point'],                          revalidate: ['/dzongs'] },
  conservation_area: { table: 'content.conservation_area', expected: ['MultiPolygon', 'Polygon'],        revalidate: ['/conservation', '/corridors'] },
  school:            { table: 'content.school',            expected: ['Point'],                          revalidate: ['/schools'] },
  health_center:     { table: 'content.health_center',     expected: ['Point'],                          revalidate: ['/health-centers'] },
  locality:          { table: 'content.locality',          expected: ['Point'],                          revalidate: ['/villages'] },
};

export async function updateGeom({ entity, id, geom }: UpdateGeomArgs): Promise<Result> {
  const spec = ENTITY_SPEC[entity];
  if (!spec) return { ok: false, message: `Unknown entity ${entity}` };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, message: 'Invalid id' };
  if (!geom || typeof geom !== 'object' || !geom.type) {
    return { ok: false, message: 'Invalid geometry' };
  }

  // Normalize Point→Point, Polygon→MultiPolygon, LineString→MultiLineString
  // to match column types where applicable.
  let normalized = geom;
  if (entity === 'trek_route' && geom.type === 'LineString') {
    normalized = { type: 'MultiLineString', coordinates: [geom.coordinates] };
  } else if (entity === 'conservation_area' && geom.type === 'Polygon') {
    normalized = { type: 'MultiPolygon', coordinates: [geom.coordinates] };
  }

  if (!spec.expected.includes(normalized.type)) {
    return { ok: false, message: `Expected ${spec.expected.join(' or ')}, got ${normalized.type}` };
  }

  const user = await getCurrentAdminUser();
  try {
    const r = await pool().query(
      `UPDATE ${spec.table}
          SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
              updated_by = $2,
              updated_at = now()
        WHERE id = $3
        RETURNING updated_at`,
      [JSON.stringify(normalized), user.id, id],
    );
    if (!r.rows[0]) return { ok: false, message: 'Row not found' };
    spec.revalidate.forEach((p) => revalidatePath(p));
    return {
      ok: true,
      updatedAt: r.rows[0].updated_at?.toISOString?.() ?? r.rows[0].updated_at,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Geometry update failed: ${msg}` };
  }
}
