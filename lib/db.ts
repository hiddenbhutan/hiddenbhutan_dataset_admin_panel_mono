/**
 * Postgres data layer.
 *
 * Replaces the legacy SpatiaLite (better-sqlite3) module. The function
 * signatures are intentionally preserved so existing pages keep working with
 * minimal edits — they just need to switch from `const x = getX()` to
 * `const x = await getX()` because pg is async.
 *
 * Schema mapping rules:
 *   - Legacy tables under `public` schema → new schema is `content.*` or
 *     `ref.*` or `geo.*`.
 *   - Legacy denormalized `district / gewog / chiwog` TEXT columns are gone.
 *     We materialize them at SELECT time by joining ref.dzongkhag /
 *     ref.gewog / ref.chiwog.
 *   - Legacy `last_updated` TEXT → `updated_at` TIMESTAMPTZ; serialized to
 *     ISO string for the UI.
 *   - Legacy INTEGER booleans (0/1) → BOOLEAN; mapped back to 0/1 to keep
 *     UI type contracts stable.
 *   - Legacy `is_active` → derived from content_status='published'.
 *   - bird_species / wildlife_species / vertebrate_species / flora_species
 *     all live in unified `content.species` keyed on scientific_name. We
 *     filter by class/kingdom/is_curated to recover the legacy slices.
 *   - location_bird_species → content.species_location with a synthesized
 *     (location_type, location_name) pair derived from the multi-FK row.
 *   - biological_corridors → content.conservation_area WHERE
 *     pa_type='biological_corridor', with connects rebuilt from
 *     content.corridor_link.
 */

import { Pool, types, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';

// node-postgres returns BIGINT (int8, OID 20) as a string to avoid precision
// loss. Every id/FK in this schema is a small identity value well within
// Number.MAX_SAFE_INTEGER, and the whole app's types assume `number`, so parse
// int8 to a JS number. (Without this, `id` arrives as "410" and server actions
// reject it as "Invalid id".) setTypeParser is process-global across all pools.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

// ── pool ────────────────────────────────────────────────────────────────────
let _pool: Pool | null = null;

function pool(): Pool {
  if (!_pool) {
    const cfg: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };
    if (process.env.PG_SSL === 'true') cfg.ssl = { rejectUnauthorized: false };
    _pool = new Pool(cfg);
  }
  return _pool;
}

async function q<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool().query<T>(sql, params);
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null));

// ── shared types ────────────────────────────────────────────────────────────
// Mirrors the editable subset of content.trek_route. `status` is the operational
// trail_status enum (open/seasonal/restricted/closed/unknown); the editorial
// workflow lives in `content_status`. `is_active` is derived from
// content_status='published' and kept for legacy UI bits.
export interface TrekRoute {
  id: number;
  name: string;
  name_dz: string | null;
  slug: string | null;
  summary: string | null;
  type: string | null;
  class: string | null;
  status: 'open' | 'seasonal' | 'restricted' | 'closed' | 'unknown' | null;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme' | null;
  duration_days: number | null;
  duration_hours_min: number | null;
  duration_hours_max: number | null;
  distance_km: number | null;
  length_m: number | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  season_start_month: number | null;
  season_end_month: number | null;
  season_open: string | null;
  permit_required: number;
  permit_type: string | null;
  permit_notes: string | null;
  fee_currency: string | null;
  fee_amount: number | null;
  highlights: string | null;
  description: string | null;
  remarks: string | null;
  is_active: number;
  last_updated: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}

export interface BirdSpecies {
  id: number;
  common_name: string;
  scientific_name: string | null;
  family: string | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  habitat_types: string | null;
  best_months: string | null;
  is_endemic: number;
  is_national_bird: number;
  conservation_status: string | null;
  plumage_notes: string | null;
  bhutan_notes: string | null;
  vocal_notes: string | null;
  location_count: number;
}

export interface LocationBirdSpecies {
  id: number;
  location_type: string;
  location_name: string;
  bird_species_id: number;
  bird_name: string;
  best_months: string | null;
  notes: string | null;
}

export interface WildlifeSpecies {
  id: number;
  common_name: string;
  scientific_name: string | null;
  habitat_zones: string | null;
  is_endemic: number;
  is_national_animal: number;
  is_national_bird: number;
  conservation_status: string | null;
  notes: string | null;
}

export interface HeritageFee {
  audience?: string;        // 'citizen' | 'saarc' | 'foreigner' | etc.
  amount?: number;
  currency?: string;        // ISO 4217
  notes?: string;
}

export interface HeritageOpeningHoursDay {
  open: string;             // 'HH:MM'
  close: string;
}

export type HeritageOpeningHours = Partial<Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  HeritageOpeningHoursDay[]
>> & { notes?: string };

export interface HeritageSite {
  id: number;
  name: string;
  name_dz: string | null;
  name_romanized: string | null;
  slug: string | null;
  description: string | null;
  type: string | null;          // ref.heritage_type.label_en (display label)
  type_code: string | null;     // ref.heritage_type.code (machine key)
  district: string | null;
  gewog: string | null;
  chiwog: string | null;
  elevation_m: number | null;
  built_year: number | null;
  built_year_approx: number | null;
  built_by: string | null;      // figure name OR fallback built_by_text
  significance: string | null;
  period: string | null;
  conservation_status: 'registered_protected' | 'registered_unprotected' | 'unregistered' | 'restored' | 'ruins' | 'lost' | 'unknown' | null;
  access_status: 'open' | 'restricted' | 'closed' | 'unknown' | null;
  visitor_info: string | null;
  fees: HeritageFee[] | null;
  opening_hours: HeritageOpeningHours | null;
  /** @deprecated First fee, kept until consumers move to the structured `fees` array. */
  entry_fee: string | null;
  /** @deprecated Raw `opening_hours::text` cast; structured form is on `opening_hours`. */
  open_hours: string | null;
  registered_id: string | null;
  nearest_trek_route_id: number | null;
  nearest_trek_route_name: string | null;
  is_accessible_from_trail: number;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  heritage_type_id: number | null;
  period_id: number | null;
  founder_figure_id: number | null;
}

/** @deprecated Use ConservationAreaRow. Kept for legacy callers until removed. */
export interface ConservationArea {
  id: number;
  code: string | null;
  pa_name: string | null;
  name: string | null;
  area_km2: number | null;
  type: string | null;
  established_year: number | null;
  managing_authority: string | null;
  permit_required: number;
  permit_info: string | null;
  key_species: string | null;
  description: string | null;
}

export type AdminRegion = 'east' | 'west' | 'central' | 'south';

export interface Dzongkhag {
  id: number;
  name: string;
  name_dz: string | null;
  code: string | null;
  region: AdminRegion | null;
  gewog_count: number;
  chiwog_count: number;
  population_total: number | null;
}
export interface Gewog {
  id: number;
  name: string;
  name_dz: string | null;
  code: string | null;
  dzongkhag_id: number;
  dzongkhag: string;
  chiwog_count: number;
  population_total: number | null;
}
export interface Chiwog {
  id: number;
  name: string;
  name_dz: string | null;
  nsb_code: string | null;
  gewog_id: number;
  gewog: string;
  dzongkhag: string;
  population: number | null;
  population_year: number | null;
}

export interface ChiwogFilter {
  dzongkhag?: string;
  gewog?: string;
  search?: string;
}
export type LocalityKind =
  | 'village' | 'hamlet' | 'settlement' | 'town' | 'thromde'
  | 'peak' | 'pass' | 'ridge' | 'valley' | 'meadow' | 'glacier'
  | 'lake' | 'river' | 'river_confluence' | 'waterfall' | 'spring'
  | 'cave' | 'cliff' | 'sacred_site' | 'landmark' | 'other';

export interface Village {
  id: number;
  name: string;
  name_dz: string | null;
  name_romanized: string | null;
  name_meaning: string | null;
  district: string;
  gewog: string;
  chiwog: string;
  pop_total: number | null;
  pop_male: number | null;
  pop_female: number | null;
  pop_year: number | null;
  elevation_m: number | null;
  has_accommodation: number | null;        // tri-state via JSONB; null = unknown
  accommodation_notes: string | null;
  has_food_supply: number | null;
  has_phone_signal: number | null;
  kind: LocalityKind;
  class: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}

export interface VillageStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  with_accommodation: number;
  with_food: number;
  with_phone: number;
}

export interface VillageFilter {
  district?: string;
  kind?: SettlementKind;
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  hasAccommodation?: boolean;
  hasFood?: boolean;
  hasPhone?: boolean;
  search?: string;
}

/**
 * Settlement-class locality kinds shown on /villages. content.locality holds
 * only settlement kinds; the non-settlement (topographic) kinds are unused.
 */
export const SETTLEMENT_KINDS = ['village', 'hamlet', 'settlement', 'town', 'thromde'] as const;
export type SettlementKind = (typeof SETTLEMENT_KINDS)[number];
const SETTLEMENT_KINDS_SQL = `(${SETTLEMENT_KINDS.map((k) => `'${k}'`).join(',')})`;
export type SchoolCategory =
  | 'community_primary' | 'primary' | 'lower_secondary' | 'middle_secondary'
  | 'higher_secondary' | 'autonomous' | 'private' | 'monastic' | 'institute' | 'other';

export interface School {
  id: number;
  name: string;
  category_id: number | null;
  category: SchoolCategory | null;       // ref.school_category code
  description: string | null;
  remarks: string | null;
  district: string;
  gewog: string;
  chiwog: string;
  students_total: number | null;
  students_male: number | null;
  students_female: number | null;
  capacity: number | null;
  elevation_m: number | null;
  has_hostel: number;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}

export interface SchoolStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  with_hostel: number;
}

export interface SchoolFilter {
  district?: string;
  category?: SchoolCategory;
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  hostelOnly?: boolean;
  search?: string;
}
export type HealthCenterType =
  | 'orc' | 'sub_post' | 'bhu_2' | 'bhu_1' | 'phc'
  | 'district_hospital' | 'regional_referral_hospital'
  | 'national_referral_hospital' | 'other';

export type HealthCenterStatus =
  | 'operational' | 'temporarily_closed' | 'under_construction'
  | 'permanently_closed' | 'unknown';

export interface HealthCenterService {
  id: number;
  service_id: number;
  code: string;
  label: string;
  is_emergency: number;
  available_24h: number | null;
  notes: string | null;
}

export interface HealthCenter {
  id: number;
  name: string;
  name_dz: string | null;
  name_old: string | null;
  description: string | null;
  type: HealthCenterType;
  status: HealthCenterStatus;
  beds: number | null;
  year_established: number | null;
  district: string;
  gewog: string;
  chiwog: string;
  village: string | null;
  elevation_m: number | null;
  has_helipad: number;
  requires_4wd_access: number;
  nearest_road_access_km: number | null;
  phone: string | null;
  has_emergency: number;
  has_ambulance: number;
  service_count: number;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}

export interface HealthCenterStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  operational: number;
  with_helipad: number;
  requires_4wd: number;
}

export interface HealthCenterFilter {
  district?: string;
  type?: HealthCenterType;
  status?: HealthCenterStatus;
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  helipadOnly?: boolean;
  fourwdOnly?: boolean;
  search?: string;
}
export interface Waypoint {
  id: number;
  name: string;
  name_dz: string | null;
  wp_type: string;            // ref.waypoint_type.code
  wp_type_label: string;      // ref.waypoint_type.label_en
  wp_category: string;        // ref.waypoint_category enum
  wp_icon: string | null;     // ref.waypoint_type.icon — kebab-case lucide name
  district: string;
  gewog: string;
  chiwog: string;
  elevation_m: number | null;
  show_in_app: number;        // ref.waypoint_type.show_in_app (canonical, read-only here)
  is_visible: number;         // content.waypoint.is_visible (editor-controlled)
  facilities: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  /** First route the waypoint belongs to, when shown in listing context. */
  trek_route_id: number | null;
  /** sequence_order from route_waypoint, when shown in route-detail context. */
  sequence_order: number | null;
  /** distance_from_start_km from route_waypoint, when shown in route-detail context. */
  distance_from_start_km: number | null;
  /** How many routes this waypoint appears on. */
  route_count: number;
  /** Longitude (WGS84). Populated by getters that select coordinates. */
  lon?: number | null;
  /** Latitude (WGS84). Populated by getters that select coordinates. */
  lat?: number | null;
}

/** A waypoint near a route but not (yet) formally linked via route_waypoint. */
export interface NearbyWaypoint {
  id: number;
  name: string;
  name_dz: string | null;
  wp_type: string;
  wp_type_label: string;
  wp_category: string;
  wp_icon: string | null;
  district: string;
  elevation_m: number | null;
  lon: number;
  lat: number;
  /** Distance from the route geometry, in meters (geography). */
  distance_m: number;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}

export interface Dzong {
  id: number;
  name: string;
  name_dz: string | null;
  name_romanized: string | null;
  slug: string | null;
  type: 'administrative_dzong' | 'monastic_dzong' | 'ta_dzong' | 'historical_dzong' | 'other' | null;
  district: string;
  gewog: string;
  chiwog: string;
  elevation_m: number | null;
  built_year: number | null;
  built_year_approx: number | null;
  built_by: string | null;             // figure name from the catalog
  founder_figure_id: number | null;
  period: string | null;               // period label
  period_id: number | null;
  heritage_site_id: number | null;
  significance: string | null;
  description: string | null;
  visitor_info: string | null;
  conservation_status: 'registered_protected' | 'registered_unprotected' | 'unregistered' | 'restored' | 'ruins' | 'lost' | 'unknown' | null;
  access_status: 'open' | 'restricted' | 'closed' | 'unknown' | null;
  is_current_admin_seat: number;
  houses_monk_body: number;
  monk_body_capacity: number | null;
  fees: HeritageFee[] | null;
  opening_hours: HeritageOpeningHours | null;
  /** @deprecated First fee amount; structured form is on `fees`. */
  entry_fee: string | null;
  /** @deprecated Raw cast; structured form is on `opening_hours`. */
  open_hours: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export interface DzongLhakhang {
  id: number;
  name: string;
  name_dz: string | null;
  description: string | null;
  significance: string | null;
  sort_order: number;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}
/** @deprecated Use ConservationAreaRow + getCorridorLinks. Kept for legacy callers until removed. */
export interface BiologicalCorridor { id: number; code: string; name: string; connects: string; key_species: string; description: string | null; }

export type PaType =
  | 'national_park' | 'wildlife_sanctuary' | 'strict_nature_reserve'
  | 'biological_corridor' | 'ramsar_site' | 'royal_botanical_park'
  | 'nature_reserve' | 'other';

export type IucnCategory =
  | 'Ia' | 'Ib' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'not_assigned';

export type ManagementZoneKind =
  | 'core' | 'buffer' | 'multi_use' | 'restoration' | 'community_use' | 'other';

/** Used for both protected areas and biological corridors. */
export interface ConservationAreaRow {
  id: number;
  slug: string | null;
  code: string | null;
  pa_name: string | null;             // as-shipped name from source dataset
  name_en: string;
  name_dz: string | null;
  description: string | null;
  key_species_notes: string | null;
  pa_type: PaType;
  pa_type_label: string;              // human-readable label derived from pa_type
  iucn_category: IucnCategory;
  managing_authority: string | null;
  established_year: number | null;
  is_active: number;
  /** Editor-curated, may differ from area_m2/1000000. */
  area_km2: number | null;
  /** Editor-curated, may differ from area_m2/10000. */
  area_ha: number | null;
  /** Geodesic, PostGIS-computed; read-only. */
  area_m2: number | null;
  permit_required: number;
  permit_info: string | null;
  access_status: 'open' | 'restricted' | 'closed' | 'unknown';
  visitor_regulations: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  /** How many corridor_link rows reference this row as corridor_id. */
  outgoing_link_count: number;
  /** How many corridor_link rows reference this row as connects_pa_id. */
  incoming_link_count: number;
  /** How many management_zone rows belong to this PA. */
  zone_count: number;
}

export interface ManagementZone {
  id: number;
  kind: ManagementZoneKind;
  name: string | null;
  description: string | null;
  regulations: string | null;
  area_m2: number | null;
}

export interface CorridorLinkRow {
  id: number;
  /** The other end of the link relative to the row you queried. */
  pa_id: number;
  pa_code: string | null;
  pa_name: string;
  pa_type: PaType;
  role: string | null;
  notes: string | null;
}

// ── trek routes ─────────────────────────────────────────────────────────────
const TREK_ROUTE_SELECT = `
  SELECT
    tr.id,
    tr.name_en                                AS name,
    tr.name_dz,
    tr.slug,
    tr.summary,
    tr.type::text                             AS type,
    tr.class::text                            AS class,
    tr.status::text                           AS status,
    tr.difficulty::text                       AS difficulty,
    tr.duration_days,
    tr.duration_hours_min,
    tr.duration_hours_max,
    tr.distance_km,
    tr.length_m,
    tr.elevation_min_m,
    tr.elevation_max_m,
    tr.elevation_gain_m,
    tr.elevation_loss_m,
    tr.season_start_month,
    tr.season_end_month,
    tr.season_notes                           AS season_open,
    (tr.permit_required)::int                 AS permit_required,
    tr.permit_type,
    tr.permit_notes,
    tr.fee_currency,
    tr.fee_amount::float                      AS fee_amount,
    CASE WHEN jsonb_typeof(tr.highlights) = 'array'
         THEN array_to_string(
                ARRAY(SELECT jsonb_array_elements_text(tr.highlights)),
                ' • ')
         ELSE NULL END                        AS highlights,
    tr.description,
    tr.remarks,
    CASE WHEN tr.content_status = 'published' THEN 1 ELSE 0 END AS is_active,
    tr.content_status::text                   AS content_status,
    tr.updated_at                             AS last_updated
  FROM content.trek_route tr
`;

export interface TrekRouteFilter {
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  type?: string;
  difficulty?: string;
  search?: string;
}

export async function getTrekRoutes(
  limit = 200,
  offset = 0,
  filter: TrekRouteFilter = {},
): Promise<TrekRoute[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const status = filter.contentStatus ?? 'all';
  if (status !== 'all') {
    params.push(status);
    where.push(`tr.content_status = $${params.length}::content.content_status`);
  }
  if (filter.type) {
    params.push(filter.type);
    where.push(`tr.type::text = $${params.length}`);
  }
  if (filter.difficulty) {
    params.push(filter.difficulty);
    where.push(`tr.difficulty::text = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`tr.name_en ILIKE $${params.length}`);
  }
  params.push(limit, offset);
  const r = await q(`${TREK_ROUTE_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY tr.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, last_updated: iso(row.last_updated) })) as TrekRoute[];
}

export async function getTrekRouteById(id: number): Promise<TrekRoute | null> {
  const r = await q(`${TREK_ROUTE_SELECT} WHERE tr.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], last_updated: iso(r.rows[0].last_updated) } as TrekRoute;
}

export async function getRouteWaypoints(routeId: number): Promise<Waypoint[]> {
  const r = await q(`
    SELECT
      w.id,
      COALESCE(w.name_en, '')                       AS name,
      w.name_dz,
      wt.code                                       AS wp_type,
      wt.label_en                                   AS wp_type_label,
      wt.category::text                             AS wp_category,
      wt.icon                                       AS wp_icon,
      COALESCE(d.name_en, '')                       AS district,
      COALESCE(g.name_en, '')                       AS gewog,
      COALESCE(c.name_en, '')                       AS chiwog,
      w.elevation_m,
      (wt.show_in_app)::int                         AS show_in_app,
      (w.is_visible)::int                           AS is_visible,
      CASE WHEN jsonb_typeof(w.facilities) = 'array'
           THEN array_to_string(
                  ARRAY(SELECT jsonb_array_elements_text(w.facilities)),
                  ', ')
           ELSE NULL END                            AS facilities,
      w.content_status::text                        AS content_status,
      rw.route_id                                   AS trek_route_id,
      rw.sequence_order,
      rw.distance_from_start_km,
      ST_X(w.geom::geometry)                        AS lon,
      ST_Y(w.geom::geometry)                        AS lat,
      (SELECT COUNT(*)::int FROM content.route_waypoint rw2 WHERE rw2.waypoint_id = w.id) AS route_count
    FROM content.waypoint w
    JOIN ref.waypoint_type wt      ON wt.id = w.waypoint_type_id
    JOIN content.route_waypoint rw ON rw.waypoint_id = w.id
    LEFT JOIN ref.dzongkhag d      ON d.id = w.dzongkhag_id
    LEFT JOIN ref.gewog g          ON g.id = w.gewog_id
    LEFT JOIN ref.chiwog c         ON c.id = w.chiwog_id
    WHERE rw.route_id = $1
    ORDER BY rw.sequence_order
  `, [routeId]);
  return r.rows as Waypoint[];
}

/**
 * Waypoints near a route's geometry that are NOT yet on the route's waypoint
 * list. Useful for "you forgot to link these" UX in the route editor. Distance
 * is measured along the geography (meters), and the radius defaults to 500m.
 */
export async function getNearbyWaypointsForRoute(
  routeId: number,
  radiusM = 500,
  limit = 30,
): Promise<NearbyWaypoint[]> {
  const r = await q(`
    SELECT
      w.id,
      COALESCE(w.name_en, '')                       AS name,
      w.name_dz,
      wt.code                                       AS wp_type,
      wt.label_en                                   AS wp_type_label,
      wt.category::text                             AS wp_category,
      wt.icon                                       AS wp_icon,
      COALESCE(d.name_en, '')                       AS district,
      w.elevation_m,
      ST_X(w.geom::geometry)                        AS lon,
      ST_Y(w.geom::geometry)                        AS lat,
      ST_Distance(w.geom::geography, tr.geom::geography)::float AS distance_m,
      w.content_status::text                        AS content_status
    FROM content.waypoint w
    JOIN ref.waypoint_type wt ON wt.id = w.waypoint_type_id
    LEFT JOIN ref.dzongkhag d  ON d.id = w.dzongkhag_id
    JOIN content.trek_route tr ON tr.id = $1
    WHERE ST_DWithin(w.geom::geography, tr.geom::geography, $2)
      AND NOT EXISTS (
        SELECT 1 FROM content.route_waypoint rw
        WHERE rw.route_id = $1 AND rw.waypoint_id = w.id
      )
    ORDER BY distance_m
    LIMIT $3
  `, [routeId, radiusM, limit]);
  return r.rows as NearbyWaypoint[];
}

export async function getTrekRouteCount(contentStatus?: 'draft' | 'in_review' | 'published' | 'archived'): Promise<number> {
  if (contentStatus) {
    const r = await q(
      `SELECT COUNT(*)::int AS n FROM content.trek_route WHERE content_status = $1`,
      [contentStatus],
    );
    return r.rows[0].n;
  }
  const r = await q(`SELECT COUNT(*)::int AS n FROM content.trek_route`);
  return r.rows[0].n;
}

export interface TrekRouteStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
}

export async function getTrekRouteStatusCounts(): Promise<TrekRouteStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total
    FROM content.trek_route
  `);
  return r.rows[0] as TrekRouteStatusCounts;
}

// ── bird species ────────────────────────────────────────────────────────────
const BIRD_SELECT = `
  SELECT
    s.id,
    s.common_name_en                                AS common_name,
    s.scientific_name,
    s.family,
    NULLIF((s.attributes->>'elevation_min_m')::int, 0) AS elevation_min_m,
    NULLIF((s.attributes->>'elevation_max_m')::int, 0) AS elevation_max_m,
    CASE WHEN jsonb_typeof(s.attributes->'habitat_types') = 'array'
         THEN array_to_string(
                ARRAY(SELECT jsonb_array_elements_text(s.attributes->'habitat_types')),
                ', ')
         ELSE NULL END                              AS habitat_types,
    s.attributes->>'best_months'                    AS best_months,
    (s.is_endemic_to_bhutan)::int                   AS is_endemic,
    (s.national_role = 'national_bird')::int        AS is_national_bird,
    csi.label_en                                    AS conservation_status,
    s.plumage_or_appearance                         AS plumage_notes,
    s.bhutan_notes,
    s.vocal_notes,
    (SELECT COUNT(*)::int FROM content.species_location sl WHERE sl.species_id = s.id) AS location_count
  FROM content.species s
  LEFT JOIN ref.conservation_status csi ON csi.id = s.conservation_status_iucn_id
  WHERE s.class = 'Aves'
    AND s.is_curated
`;

export async function getBirdSpecies(limit = 213, offset = 0): Promise<BirdSpecies[]> {
  const r = await q(`${BIRD_SELECT} ORDER BY s.common_name_en LIMIT $1 OFFSET $2`,
    [limit, offset]);
  return r.rows as BirdSpecies[];
}

export async function getBirdSpeciesById(id: number): Promise<BirdSpecies | null> {
  const r = await q(`${BIRD_SELECT} AND s.id = $1`, [id]);
  return (r.rows[0] ?? null) as BirdSpecies | null;
}

// content.species_location has 4 FK columns. Derive a (location_type,
// location_name) pair so the UI keeps its existing shape.
const LOCATION_BIRD_SELECT = `
  SELECT
    sl.id,
    CASE
      WHEN sl.conservation_area_id IS NOT NULL THEN 'conservation_area'
      WHEN sl.trek_route_id        IS NOT NULL THEN 'route_area'
      WHEN sl.locality_id          IS NOT NULL THEN 'valley'
      WHEN sl.dzongkhag_id         IS NOT NULL THEN 'district'
      ELSE 'unknown'
    END                                            AS location_type,
    COALESCE(
      ca.name_en, tr.name_en, l.name_en, dzo.name_en, '(unspecified)'
    )                                              AS location_name,
    sl.species_id                                  AS bird_species_id,
    s.common_name_en                               AS bird_name,
    sl.best_months,
    sl.notes
  FROM content.species_location sl
  JOIN content.species s ON s.id = sl.species_id AND s.class = 'Aves'
  LEFT JOIN content.conservation_area ca ON ca.id = sl.conservation_area_id
  LEFT JOIN content.trek_route        tr ON tr.id = sl.trek_route_id
  LEFT JOIN content.locality          l  ON l.id  = sl.locality_id
  LEFT JOIN ref.dzongkhag             dzo ON dzo.id = sl.dzongkhag_id
`;

export async function getLocationBirdSpeciesForBird(birdId: number): Promise<LocationBirdSpecies[]> {
  const r = await q(`${LOCATION_BIRD_SELECT} WHERE s.id = $1`, [birdId]);
  return r.rows as LocationBirdSpecies[];
}

export async function getAllLocationBirdSpecies(): Promise<LocationBirdSpecies[]> {
  const r = await q(LOCATION_BIRD_SELECT);
  return r.rows as LocationBirdSpecies[];
}

export async function getBirdFamilies(): Promise<string[]> {
  const r = await q(`
    SELECT DISTINCT family
    FROM content.species
    WHERE class = 'Aves' AND is_curated AND family IS NOT NULL
    ORDER BY family
  `);
  return r.rows.map(row => row.family as string);
}

// ── wildlife (non-bird animals) ─────────────────────────────────────────────
export async function getWildlifeSpecies(): Promise<WildlifeSpecies[]> {
  const r = await q(`
    SELECT
      s.id,
      s.common_name_en                              AS common_name,
      s.scientific_name,
      CASE WHEN jsonb_typeof(s.attributes->'habitat_zones') = 'array'
           THEN array_to_string(
                  ARRAY(SELECT jsonb_array_elements_text(s.attributes->'habitat_zones')),
                  ', ')
           ELSE s.habitat END                       AS habitat_zones,
      (s.is_endemic_to_bhutan)::int                 AS is_endemic,
      (s.national_role = 'national_animal')::int    AS is_national_animal,
      (s.national_role = 'national_bird')::int      AS is_national_bird,
      csi.label_en                                  AS conservation_status,
      s.bhutan_notes                                AS notes
    FROM content.species s
    LEFT JOIN ref.conservation_status csi ON csi.id = s.conservation_status_iucn_id
    WHERE s.kingdom = 'animalia'
      AND s.is_curated
      AND (s.class IS NULL OR s.class <> 'Aves')
    ORDER BY s.common_name_en
  `);
  return r.rows as WildlifeSpecies[];
}

// ── species (unified flora + fauna) ─────────────────────────────────────────
// The schema unifies birds, wildlife, plants and the GBIF taxonomic checklist
// in content.species, keyed on scientific_name with kingdom + class
// discriminators. The legacy birds/wildlife helpers above are kept for their
// existing callers; the new admin surfaces use these generic helpers.

export type IucnStatus = 'EX' | 'EW' | 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE';
export type SpeciesKingdom = 'animalia' | 'plantae' | 'fungi' | 'chromista' | 'protozoa' | 'bacteria' | 'archaea';
export type NationalSpeciesRole = 'national_animal' | 'national_bird' | 'national_flower' | 'national_tree';
export type SpeciesAbundance = 'abundant' | 'common' | 'uncommon' | 'rare' | 'vagrant' | 'extirpated' | 'unknown';
export type SpeciesAliasKind = 'synonym' | 'vernacular_en' | 'vernacular_dz' | 'vernacular_romanized' | 'vernacular_local' | 'misspelling';
export type ObservationConfidence = 'confirmed' | 'probable' | 'possible' | 'unconfirmed';

export interface SpeciesAttributes {
  // bird convention
  elevation_min_m?: number;
  elevation_max_m?: number;
  best_months?: string;
  habitat_types?: string[];
  // mammal convention
  habitat_zones?: string[];
  activity_pattern?: string;
  // plant convention
  growth_form?: string;
  flowering_months?: string[];
  medicinal_uses?: string[];
  [key: string]: unknown;
}

export interface Species {
  id: number;
  slug: string | null;
  scientific_name: string;
  scientific_name_full: string | null;
  authorship: string | null;
  kingdom: SpeciesKingdom;
  phylum: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  taxon_rank: string;
  gbif_taxon_key: number | null;
  gbif_usage_key: number | null;
  common_name_en: string | null;
  common_name_dz: string | null;
  conservation_status_iucn_id: number;
  conservation_status_bhutan_id: number;
  conservation_status_iucn: IucnStatus;    // code (label_en), for the status badge
  conservation_status_bhutan: IucnStatus;  // code (label_en), for the status badge
  is_endemic_to_bhutan: number;
  is_endemic_to_himalaya: number;
  national_role: NationalSpeciesRole | null;
  bhutan_abundance: SpeciesAbundance;
  short_summary: string | null;
  bhutan_notes: string | null;
  plumage_or_appearance: string | null;
  vocal_notes: string | null;
  habitat: string | null;
  diet: string | null;
  behavior: string | null;
  folklore: string | null;
  wikipedia_url: string | null;
  wikipedia_summary: string | null;
  thumbnail_url: string | null;
  attributes: SpeciesAttributes;
  is_curated: number;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  alias_count: number;
  location_count: number;
  occurrence_count: number;
}

export interface SpeciesAlias {
  id: number;
  kind: SpeciesAliasKind;
  name: string;
  region: string | null;
  notes: string | null;
}

export interface SpeciesLocationRow {
  id: number;
  kind: 'conservation_area' | 'trek_route' | 'locality' | 'dzongkhag';
  target_id: number;
  name: string;
  abundance: SpeciesAbundance;
  best_months: string | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  notes: string | null;
  source_dataset: string | null;
}

export interface SpeciesOccurrenceRow {
  id: number;
  observed_at: string | null;
  observer: string | null;
  accuracy_m: number | null;
  elevation_m: number | null;
  lon: number | null;
  lat: number | null;
  confidence: ObservationConfidence;
  category: string;
  source_record_id: string | null;
  observed_date_precision: string | null;
  notes: string | null;
  image_url: string | null;
}

const SPECIES_SELECT = `
  SELECT
    s.id,
    s.slug,
    s.scientific_name,
    s.scientific_name_full,
    s.authorship,
    s.kingdom::text                  AS kingdom,
    s.phylum,
    s.class,
    s."order"                        AS "order",
    s.family,
    s.genus,
    s.taxon_rank,
    s.gbif_taxon_key,
    s.gbif_usage_key,
    s.common_name_en,
    s.common_name_dz,
    s.conservation_status_iucn_id,
    s.conservation_status_bhutan_id,
    csi.label_en                     AS conservation_status_iucn,
    csb.label_en                     AS conservation_status_bhutan,
    (s.is_endemic_to_bhutan)::int   AS is_endemic_to_bhutan,
    (s.is_endemic_to_himalaya)::int AS is_endemic_to_himalaya,
    s.national_role::text            AS national_role,
    s.bhutan_abundance::text         AS bhutan_abundance,
    s.short_summary,
    s.bhutan_notes,
    s.plumage_or_appearance,
    s.vocal_notes,
    s.habitat,
    s.diet,
    s.behavior,
    s.folklore,
    s.wikipedia_url,
    s.wikipedia_summary,
    s.thumbnail_url,
    s.attributes,
    (s.is_curated)::int              AS is_curated,
    s.content_status::text           AS content_status,
    s.updated_at,
    (SELECT COUNT(*)::int FROM content.species_alias      sa WHERE sa.species_id = s.id) AS alias_count,
    (SELECT COUNT(*)::int FROM content.species_location   sl WHERE sl.species_id = s.id) AS location_count,
    (SELECT COUNT(*)::int FROM content.species_occurrence so WHERE so.species_id = s.id) AS occurrence_count
  FROM content.species s
  LEFT JOIN ref.conservation_status csi ON csi.id = s.conservation_status_iucn_id
  LEFT JOIN ref.conservation_status csb ON csb.id = s.conservation_status_bhutan_id
`;

export interface SpeciesFilter {
  kingdom?: SpeciesKingdom;
  /** Specific class name (e.g. 'Aves', 'Mammalia'). */
  class?: string;
  /** Special slice: kingdom=animalia AND class != 'Aves'. */
  excludeClass?: string;
  family?: string;
  isCurated?: boolean;
  /** Filter by IUCN global status. */
  iucn?: IucnStatus;
  iucnBhutan?: IucnStatus;
  nationalRole?: NationalSpeciesRole;
  endemic?: 'bhutan' | 'himalaya' | 'any';
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  /** Matches common_name_en, scientific_name, and species_alias.name. */
  search?: string;
}

function buildSpeciesWhere(filter: SpeciesFilter): { where: string[]; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.kingdom) {
    params.push(filter.kingdom);
    where.push(`s.kingdom = $${params.length}::content.species_kingdom`);
  }
  if (filter.class) {
    params.push(filter.class);
    where.push(`s.class = $${params.length}`);
  }
  if (filter.excludeClass) {
    params.push(filter.excludeClass);
    where.push(`(s.class IS NULL OR s.class <> $${params.length})`);
  }
  if (filter.family) {
    params.push(filter.family);
    where.push(`s.family = $${params.length}`);
  }
  if (filter.isCurated !== undefined) {
    where.push(`s.is_curated = ${filter.isCurated ? 'TRUE' : 'FALSE'}`);
  }
  if (filter.iucn) {
    params.push(filter.iucn);
    where.push(`s.conservation_status_iucn_id = (SELECT id FROM ref.conservation_status WHERE label_en = $${params.length})`);
  }
  if (filter.iucnBhutan) {
    params.push(filter.iucnBhutan);
    where.push(`s.conservation_status_bhutan_id = (SELECT id FROM ref.conservation_status WHERE label_en = $${params.length})`);
  }
  if (filter.nationalRole) {
    params.push(filter.nationalRole);
    where.push(`s.national_role = $${params.length}::content.national_species_role`);
  }
  if (filter.endemic === 'bhutan')   where.push(`s.is_endemic_to_bhutan`);
  if (filter.endemic === 'himalaya') where.push(`s.is_endemic_to_himalaya`);
  if (filter.endemic === 'any')      where.push(`(s.is_endemic_to_bhutan OR s.is_endemic_to_himalaya)`);
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`s.content_status = $${params.length}::content.content_status`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const i = params.length;
    where.push(`(
      s.common_name_en ILIKE $${i}
      OR s.scientific_name ILIKE $${i}
      OR EXISTS (SELECT 1 FROM content.species_alias sa WHERE sa.species_id = s.id AND sa.name ILIKE $${i})
    )`);
  }
  return { where, params };
}

export async function getSpecies(
  filter: SpeciesFilter = {},
  limit = 500,
  offset = 0,
): Promise<Species[]> {
  const { where, params } = buildSpeciesWhere(filter);
  params.push(limit, offset);
  const r = await q(`${SPECIES_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY s.common_name_en NULLS LAST, s.scientific_name
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as Species[];
}

export async function getSpeciesById(id: number): Promise<Species | null> {
  const r = await q(`${SPECIES_SELECT} WHERE s.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as Species;
}

export interface SpeciesStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  iucn: Record<IucnStatus, number>;
  endemic_bhutan: number;
  endemic_himalaya: number;
  national_role: number;
}

export async function getSpeciesStatusCounts(filter: SpeciesFilter = {}): Promise<SpeciesStatusCounts> {
  const { where, params } = buildSpeciesWhere({ ...filter, contentStatus: 'all' });
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE s.content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE s.content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE s.content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE s.content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                                AS total,
      COUNT(*) FILTER (WHERE csi.label_en = 'EX')::int AS iucn_EX,
      COUNT(*) FILTER (WHERE csi.label_en = 'EW')::int AS iucn_EW,
      COUNT(*) FILTER (WHERE csi.label_en = 'CR')::int AS iucn_CR,
      COUNT(*) FILTER (WHERE csi.label_en = 'EN')::int AS iucn_EN,
      COUNT(*) FILTER (WHERE csi.label_en = 'VU')::int AS iucn_VU,
      COUNT(*) FILTER (WHERE csi.label_en = 'NT')::int AS iucn_NT,
      COUNT(*) FILTER (WHERE csi.label_en = 'LC')::int AS iucn_LC,
      COUNT(*) FILTER (WHERE csi.label_en = 'DD')::int AS iucn_DD,
      COUNT(*) FILTER (WHERE csi.label_en = 'NE')::int AS iucn_NE,
      COUNT(*) FILTER (WHERE s.is_endemic_to_bhutan)::int           AS endemic_bhutan,
      COUNT(*) FILTER (WHERE s.is_endemic_to_himalaya)::int         AS endemic_himalaya,
      COUNT(*) FILTER (WHERE s.national_role IS NOT NULL)::int     AS national_role
    FROM content.species s
    LEFT JOIN ref.conservation_status csi ON csi.id = s.conservation_status_iucn_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `, params);
  const row = r.rows[0];
  return {
    draft: row.draft,
    in_review: row.in_review,
    published: row.published,
    archived: row.archived,
    total: row.total,
    iucn: {
      EX: row.iucn_EX, EW: row.iucn_EW, CR: row.iucn_CR, EN: row.iucn_EN,
      VU: row.iucn_VU, NT: row.iucn_NT, LC: row.iucn_LC, DD: row.iucn_DD, NE: row.iucn_NE,
    },
    endemic_bhutan: row.endemic_bhutan,
    endemic_himalaya: row.endemic_himalaya,
    national_role: row.national_role,
  };
}

export async function getSpeciesClassOptions(kingdom?: SpeciesKingdom): Promise<Array<{ class: string; count: number }>> {
  const params: unknown[] = [];
  let where = `class IS NOT NULL`;
  if (kingdom) {
    params.push(kingdom);
    where += ` AND kingdom = $${params.length}::content.species_kingdom`;
  }
  const r = await q(`
    SELECT class, COUNT(*)::int AS count
    FROM content.species
    WHERE ${where}
    GROUP BY class
    ORDER BY count DESC
  `, params);
  return r.rows as Array<{ class: string; count: number }>;
}

export async function getSpeciesFamilyOptions(filter: Pick<SpeciesFilter, 'kingdom' | 'class' | 'excludeClass'> = {}): Promise<string[]> {
  const { where, params } = buildSpeciesWhere(filter);
  where.push(`s.family IS NOT NULL`);
  const r = await q(`
    SELECT DISTINCT s.family
    FROM content.species s
    WHERE ${where.join(' AND ')}
    ORDER BY s.family
  `, params);
  return r.rows.map(row => row.family as string);
}

export async function getSpeciesAliases(speciesId: number): Promise<SpeciesAlias[]> {
  const r = await q(`
    SELECT id, kind::text AS kind, name, region, notes
    FROM content.species_alias
    WHERE species_id = $1
    ORDER BY kind, name
  `, [speciesId]);
  return r.rows as SpeciesAlias[];
}

export async function getSpeciesLocations(speciesId: number): Promise<SpeciesLocationRow[]> {
  const r = await q(`
    SELECT
      sl.id,
      CASE
        WHEN sl.conservation_area_id IS NOT NULL THEN 'conservation_area'
        WHEN sl.trek_route_id        IS NOT NULL THEN 'trek_route'
        WHEN sl.locality_id          IS NOT NULL THEN 'locality'
        WHEN sl.dzongkhag_id         IS NOT NULL THEN 'dzongkhag'
      END                                                                AS kind,
      COALESCE(sl.conservation_area_id, sl.trek_route_id, sl.locality_id, sl.dzongkhag_id) AS target_id,
      COALESCE(ca.name_en, tr.name_en, lc.name_en, dz.name_en, '(unknown)') AS name,
      sl.abundance::text                                                 AS abundance,
      sl.best_months,
      sl.elevation_min_m,
      sl.elevation_max_m,
      sl.notes,
      sl.source_dataset
    FROM content.species_location sl
    LEFT JOIN content.conservation_area ca ON ca.id = sl.conservation_area_id
    LEFT JOIN content.trek_route        tr ON tr.id = sl.trek_route_id
    LEFT JOIN content.locality          lc ON lc.id = sl.locality_id
    LEFT JOIN ref.dzongkhag             dz ON dz.id = sl.dzongkhag_id
    WHERE sl.species_id = $1
    ORDER BY sl.abundance, name
  `, [speciesId]);
  return r.rows as SpeciesLocationRow[];
}

export async function getSpeciesOccurrences(speciesId: number, limit = 20): Promise<SpeciesOccurrenceRow[]> {
  const r = await q(`
    SELECT
      so.id,
      so.observed_at,
      so.observer,
      so.accuracy_m,
      so.elevation_m,
      ST_X(so.geom)             AS lon,
      ST_Y(so.geom)             AS lat,
      so.confidence::text       AS confidence,
      oc.label_en               AS category,
      so.source_record_id,
      so.observed_date_precision,
      so.notes,
      so.image_url
    FROM content.species_occurrence so
    JOIN ref.observation_category oc ON oc.id = so.category_id
    WHERE so.species_id = $1
    ORDER BY so.observed_at DESC NULLS LAST
    LIMIT $2
  `, [speciesId, limit]);
  return r.rows.map(row => ({ ...row, observed_at: iso(row.observed_at) })) as SpeciesOccurrenceRow[];
}

export interface SpeciesSightingPoint {
  lon: number;
  lat: number;
  confidence: ObservationConfidence;
  category: string;
  observed_at: string | null;
  observed_date_precision: string | null;
  observer: string | null;
  elevation_m: number | null;
  notes: string | null;
  has_photo: boolean;
}

/** Coordinates + minimal popup fields for EVERY sighting of a species, for the map. */
export async function getSpeciesSightingPoints(speciesId: number): Promise<SpeciesSightingPoint[]> {
  const r = await q(`
    SELECT
      ST_X(so.geom)             AS lon,
      ST_Y(so.geom)             AS lat,
      so.confidence::text       AS confidence,
      oc.label_en               AS category,
      so.observed_at,
      so.observed_date_precision,
      so.observer,
      so.elevation_m,
      so.notes,
      (so.image_url IS NOT NULL) AS has_photo
    FROM content.species_occurrence so
    JOIN ref.observation_category oc ON oc.id = so.category_id
    WHERE so.species_id = $1
  `, [speciesId]);
  return r.rows.map(row => ({ ...row, observed_at: iso(row.observed_at) })) as SpeciesSightingPoint[];
}

// ── culture: zorig chusum / national symbols / customs / games ──────────────
// All four tables share the same content_status mixin and small (10s of rows)
// row counts. Each is loaded in full for its respective tab on /culture.

export interface ZorigChusum {
  id: number;
  slug: string | null;
  ordinal: number;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  short_summary: string | null;
  description: string | null;
  history: string | null;
  tools: string | null;
  masters: string[] | null;
  where_practiced: string[] | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export type NationalSymbolKind =
  | 'animal' | 'bird' | 'flower' | 'tree' | 'sport'
  | 'dress_male' | 'dress_female' | 'game' | 'anthem'
  | 'flag' | 'emblem' | 'currency' | 'day' | 'other';

export interface NationalSymbol {
  id: number;
  kind: NationalSymbolKind;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  description: string | null;
  significance: string | null;
  folklore: string | null;
  history: string | null;
  species_id: number | null;
  species_name: string | null;
  figure_id: number | null;
  figure_name: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export type CulturalCustomCategory =
  | 'greeting' | 'dress' | 'dining' | 'religious' | 'hospitality'
  | 'gift_giving' | 'taboo' | 'driglam_namzha' | 'etiquette' | 'other';

export type CulturalSeverity = 'informational' | 'advisable' | 'important' | 'critical';

export interface CulturalCustom {
  id: number;
  slug: string | null;
  category: CulturalCustomCategory;
  title_en: string;
  title_dz: string | null;
  description: string | null;
  visitor_guidance: string | null;
  background: string | null;
  severity: CulturalSeverity;
  applies_in_contexts: string[] | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export interface TraditionalGame {
  id: number;
  slug: string | null;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  description: string | null;
  rules: string | null;
  history: string | null;
  equipment: string | null;
  season: string | null;
  is_competitive: number;
  is_national_sport: number;
  /** Raw PG int4range text representation, e.g. '[2,30)'. UI parses to min/max. */
  typical_players: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

const ZORIG_SELECT = `
  SELECT
    id, slug, ordinal, name_en, name_dz, name_romanized,
    short_summary, description, history, tools,
    CASE WHEN jsonb_typeof(masters) = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(masters)) ELSE NULL END AS masters,
    CASE WHEN jsonb_typeof(where_practiced) = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(where_practiced)) ELSE NULL END AS where_practiced,
    content_status::text AS content_status,
    updated_at
  FROM content.zorig_chusum
`;

export async function getZorigChusum(): Promise<ZorigChusum[]> {
  const r = await q(`${ZORIG_SELECT} ORDER BY ordinal`);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as ZorigChusum[];
}

export async function getZorigChusumById(id: number): Promise<ZorigChusum | null> {
  const r = await q(`${ZORIG_SELECT} WHERE id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as ZorigChusum;
}

const NATIONAL_SYMBOL_SELECT = `
  SELECT
    ns.id,
    ns.kind::text         AS kind,
    ns.name_en,
    ns.name_dz,
    ns.name_romanized,
    ns.description,
    ns.significance,
    ns.folklore,
    ns.history,
    ns.species_id,
    s.common_name_en      AS species_name,
    ns.figure_id,
    hf.name_en            AS figure_name,
    ns.content_status::text AS content_status,
    ns.updated_at
  FROM content.national_symbol ns
  LEFT JOIN content.species s            ON s.id  = ns.species_id
  LEFT JOIN content.historical_figure hf ON hf.id = ns.figure_id
`;

export async function getNationalSymbols(): Promise<NationalSymbol[]> {
  const r = await q(`${NATIONAL_SYMBOL_SELECT} ORDER BY ns.kind, ns.name_en`);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as NationalSymbol[];
}

export async function getNationalSymbolById(id: number): Promise<NationalSymbol | null> {
  const r = await q(`${NATIONAL_SYMBOL_SELECT} WHERE ns.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as NationalSymbol;
}

const CULTURAL_CUSTOM_SELECT = `
  SELECT
    id, slug,
    category::text AS category,
    title_en, title_dz,
    description, visitor_guidance, background,
    severity::text AS severity,
    CASE WHEN jsonb_typeof(applies_in_contexts) = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(applies_in_contexts)) ELSE NULL END AS applies_in_contexts,
    content_status::text AS content_status,
    updated_at
  FROM content.cultural_custom
`;

export async function getCulturalCustoms(): Promise<CulturalCustom[]> {
  const r = await q(`${CULTURAL_CUSTOM_SELECT}
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'important' THEN 1
        WHEN 'advisable' THEN 2
        ELSE 3
      END,
      title_en`);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as CulturalCustom[];
}

export async function getCulturalCustomById(id: number): Promise<CulturalCustom | null> {
  const r = await q(`${CULTURAL_CUSTOM_SELECT} WHERE id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as CulturalCustom;
}

const TRADITIONAL_GAME_SELECT = `
  SELECT
    id, slug, name_en, name_dz, name_romanized,
    description, rules, history, equipment, season,
    (is_competitive)::int    AS is_competitive,
    (is_national_sport)::int AS is_national_sport,
    typical_players::text    AS typical_players,
    content_status::text     AS content_status,
    updated_at
  FROM content.traditional_game
`;

export async function getTraditionalGames(): Promise<TraditionalGame[]> {
  const r = await q(`${TRADITIONAL_GAME_SELECT}
    ORDER BY is_national_sport DESC, name_en`);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as TraditionalGame[];
}

export async function getTraditionalGameById(id: number): Promise<TraditionalGame | null> {
  const r = await q(`${TRADITIONAL_GAME_SELECT} WHERE id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as TraditionalGame;
}

export interface CultureCounts {
  zorig:   { total: number; published: number; draft: number };
  symbols: { total: number; published: number; draft: number };
  customs: { total: number; published: number; draft: number };
  games:   { total: number; published: number; draft: number };
}

export async function getCultureCounts(): Promise<CultureCounts> {
  const r = await q(`
    SELECT
      (SELECT COUNT(*)::int FROM content.zorig_chusum)                                   AS zorig_total,
      (SELECT COUNT(*)::int FROM content.zorig_chusum    WHERE content_status='published') AS zorig_pub,
      (SELECT COUNT(*)::int FROM content.zorig_chusum    WHERE content_status='draft')    AS zorig_draft,
      (SELECT COUNT(*)::int FROM content.national_symbol)                                AS sym_total,
      (SELECT COUNT(*)::int FROM content.national_symbol WHERE content_status='published') AS sym_pub,
      (SELECT COUNT(*)::int FROM content.national_symbol WHERE content_status='draft')    AS sym_draft,
      (SELECT COUNT(*)::int FROM content.cultural_custom)                                AS cus_total,
      (SELECT COUNT(*)::int FROM content.cultural_custom WHERE content_status='published') AS cus_pub,
      (SELECT COUNT(*)::int FROM content.cultural_custom WHERE content_status='draft')    AS cus_draft,
      (SELECT COUNT(*)::int FROM content.traditional_game)                                AS game_total,
      (SELECT COUNT(*)::int FROM content.traditional_game WHERE content_status='published') AS game_pub,
      (SELECT COUNT(*)::int FROM content.traditional_game WHERE content_status='draft')    AS game_draft
  `);
  const row = r.rows[0];
  return {
    zorig:   { total: row.zorig_total, published: row.zorig_pub, draft: row.zorig_draft },
    symbols: { total: row.sym_total,   published: row.sym_pub,   draft: row.sym_draft },
    customs: { total: row.cus_total,   published: row.cus_pub,   draft: row.cus_draft },
    games:   { total: row.game_total,  published: row.game_pub,  draft: row.game_draft },
  };
}

export async function getSpeciesOptions(limit = 1000): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, NULL::text AS code,
           COALESCE(common_name_en, scientific_name) AS label
    FROM content.species
    WHERE is_curated
    ORDER BY common_name_en, scientific_name
    LIMIT $1
  `, [limit]);
  return r.rows as RefOption[];
}

// ── cuisine (food + drink) ──────────────────────────────────────────────────
export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'eye_watering';
export type CuisineLocationRole = 'origin' | 'popular' | 'specialty' | 'seasonal' | 'ceremonial';

export interface CuisineCategory extends RefOption {
  icon: string | null;
}

export interface CuisineItem {
  id: number;
  slug: string | null;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  description: string | null;
  short_summary: string | null;
  category_id: number | null;
  category_code: string | null;
  category_label: string | null;
  spice_level: SpiceLevel;
  is_vegetarian: number;
  is_vegan: number;
  contains_dairy: number;
  contains_pork: number;
  contains_beef: number;
  contains_chicken: number;
  contains_alcohol: number;
  is_national_dish: number;
  is_ceremonial: number;
  preparation: string | null;
  serving_notes: string | null;
  typical_occasions: string[] | null;
  history: string | null;
  folklore: string | null;
  region_dzongkhag_id: number | null;
  region_dzongkhag_name: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  ingredient_count: number;
  location_count: number;
}

export interface CuisineIngredient {
  id: number;
  slug: string | null;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  description: string | null;
  notes: string | null;
  species_id: number | null;
  species_name: string | null;
  is_local: number;
  is_seasonal: number;
  season_months: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
}

export interface CuisineItemIngredient {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  is_optional: number;
  is_garnish: number;
  quantity_notes: string | null;
  sort_order: number;
}

export interface CuisineItemLocation {
  id: number;
  kind: 'dzongkhag' | 'locality';
  target_id: number;
  name: string;
  role: CuisineLocationRole;
  notes: string | null;
}

const CUISINE_ITEM_SELECT = `
  SELECT
    ci.id,
    ci.slug,
    ci.name_en,
    ci.name_dz,
    ci.name_romanized,
    ci.description,
    ci.short_summary,
    ci.category_id,
    cc.code                       AS category_code,
    COALESCE(cc.label_en, cc.code) AS category_label,
    ci.spice_level::text          AS spice_level,
    (ci.is_vegetarian)::int       AS is_vegetarian,
    (ci.is_vegan)::int             AS is_vegan,
    (ci.contains_dairy)::int       AS contains_dairy,
    (ci.contains_pork)::int        AS contains_pork,
    (ci.contains_beef)::int        AS contains_beef,
    (ci.contains_chicken)::int     AS contains_chicken,
    (ci.contains_alcohol)::int     AS contains_alcohol,
    (ci.is_national_dish)::int     AS is_national_dish,
    (ci.is_ceremonial)::int        AS is_ceremonial,
    ci.preparation,
    ci.serving_notes,
    CASE WHEN jsonb_typeof(ci.typical_occasions) = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(ci.typical_occasions))
         ELSE NULL END             AS typical_occasions,
    ci.history,
    ci.folklore,
    ci.region_dzongkhag_id,
    dz.name_en                    AS region_dzongkhag_name,
    ci.content_status::text       AS content_status,
    ci.updated_at,
    (SELECT COUNT(*)::int FROM content.cuisine_item_ingredient cii WHERE cii.cuisine_item_id = ci.id) AS ingredient_count,
    (SELECT COUNT(*)::int FROM content.cuisine_item_location    cil WHERE cil.cuisine_item_id = ci.id) AS location_count
  FROM content.cuisine_item ci
  LEFT JOIN ref.cuisine_category cc ON cc.id = ci.category_id
  LEFT JOIN ref.dzongkhag        dz ON dz.id = ci.region_dzongkhag_id
`;

export interface CuisineFilter {
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  categoryCode?: string;
  spiceLevel?: SpiceLevel;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isNationalDish?: boolean;
  isCeremonial?: boolean;
  search?: string;
}

export async function getCuisineItems(filter: CuisineFilter = {}, limit = 500, offset = 0): Promise<CuisineItem[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const status = filter.contentStatus ?? 'all';
  if (status !== 'all') {
    params.push(status);
    where.push(`ci.content_status = $${params.length}::content.content_status`);
  }
  if (filter.categoryCode) {
    params.push(filter.categoryCode);
    where.push(`cc.code = $${params.length}`);
  }
  if (filter.spiceLevel) {
    params.push(filter.spiceLevel);
    where.push(`ci.spice_level = $${params.length}::content.spice_level`);
  }
  if (filter.isVegetarian)   where.push(`ci.is_vegetarian`);
  if (filter.isVegan)        where.push(`ci.is_vegan`);
  if (filter.isNationalDish) where.push(`ci.is_national_dish`);
  if (filter.isCeremonial)   where.push(`ci.is_ceremonial`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(ci.name_en ILIKE $${params.length} OR ci.name_dz ILIKE $${params.length} OR ci.name_romanized ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const r = await q(`${CUISINE_ITEM_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY cc.sort_order NULLS LAST, ci.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as CuisineItem[];
}

export async function getCuisineItemById(id: number): Promise<CuisineItem | null> {
  const r = await q(`${CUISINE_ITEM_SELECT} WHERE ci.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as CuisineItem;
}

export interface CuisineStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  vegetarian: number;
  vegan: number;
  national_dish: number;
  ceremonial: number;
}

export async function getCuisineStatusCounts(): Promise<CuisineStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE is_vegetarian)::int                 AS vegetarian,
      COUNT(*) FILTER (WHERE is_vegan)::int                      AS vegan,
      COUNT(*) FILTER (WHERE is_national_dish)::int              AS national_dish,
      COUNT(*) FILTER (WHERE is_ceremonial)::int                 AS ceremonial
    FROM content.cuisine_item
  `);
  return r.rows[0] as CuisineStatusCounts;
}

export async function getCuisineCategoryOptions(): Promise<CuisineCategory[]> {
  const r = await q(`
    SELECT id, code, COALESCE(label_en, code) AS label, icon
    FROM ref.cuisine_category
    ORDER BY sort_order, label_en
  `);
  return r.rows as CuisineCategory[];
}

export async function getCuisineIngredientOptions(): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, slug AS code, name_en AS label
    FROM content.cuisine_ingredient
    ORDER BY name_en
  `);
  return r.rows as RefOption[];
}

export async function getCuisineItemIngredients(cuisineItemId: number): Promise<CuisineItemIngredient[]> {
  const r = await q(`
    SELECT
      cii.id,
      cii.ingredient_id,
      ci.name_en              AS ingredient_name,
      (cii.is_optional)::int  AS is_optional,
      (cii.is_garnish)::int   AS is_garnish,
      cii.quantity_notes,
      cii.sort_order
    FROM content.cuisine_item_ingredient cii
    JOIN content.cuisine_ingredient ci ON ci.id = cii.ingredient_id
    WHERE cii.cuisine_item_id = $1
    ORDER BY cii.sort_order, ci.name_en
  `, [cuisineItemId]);
  return r.rows as CuisineItemIngredient[];
}

export async function getCuisineItemLocations(cuisineItemId: number): Promise<CuisineItemLocation[]> {
  const r = await q(`
    SELECT
      cil.id,
      CASE WHEN cil.dzongkhag_id IS NOT NULL THEN 'dzongkhag' ELSE 'locality' END AS kind,
      COALESCE(cil.dzongkhag_id, cil.locality_id) AS target_id,
      COALESCE(dz.name_en, lc.name_en, '(unknown)') AS name,
      cil.role::text                                  AS role,
      cil.notes
    FROM content.cuisine_item_location cil
    LEFT JOIN ref.dzongkhag       dz ON dz.id = cil.dzongkhag_id
    LEFT JOIN content.locality    lc ON lc.id = cil.locality_id
    WHERE cil.cuisine_item_id = $1
    ORDER BY
      CASE cil.role
        WHEN 'origin' THEN 0
        WHEN 'specialty' THEN 1
        WHEN 'popular' THEN 2
        WHEN 'seasonal' THEN 3
        WHEN 'ceremonial' THEN 4
      END,
      name
  `, [cuisineItemId]);
  return r.rows as CuisineItemLocation[];
}

// ── media (polymorphic) ─────────────────────────────────────────────────────
export type MediaEntityType =
  | 'locality' | 'trek_route' | 'waypoint' | 'heritage_site' | 'dzong'
  | 'health_center' | 'school' | 'conservation_area' | 'biological_corridor'
  | 'festival' | 'thangka' | 'cuisine_item' | 'cuisine_ingredient'
  | 'species' | 'species_occurrence' | 'historical_figure'
  | 'zorig_chusum' | 'national_symbol' | 'cultural_custom' | 'traditional_game'
  | 'dzong_lhakhang';

export type MediaKind = 'image' | 'video' | 'audio' | 'panorama_360' | 'model_3d';

export type MediaLicense =
  | 'all_rights_reserved' | 'cc0' | 'cc_by' | 'cc_by_sa' | 'cc_by_nc'
  | 'cc_by_nc_sa' | 'public_domain' | 'used_with_permission';

export interface MediaItem {
  id: number;
  entity_type: MediaEntityType;
  entity_id: number;
  entity_name: string | null;             // joined from the target table
  kind: MediaKind;
  storage_key: string;
  cdn_url: string | null;
  mime_type: string | null;
  byte_size: number | null;
  width_px: number | null;
  height_px: number | null;
  duration_s: number | null;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  is_primary: number;
  photographer: string | null;
  license: MediaLicense;
  license_notes: string | null;
  taken_at: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export interface MediaFilter {
  entityType?: MediaEntityType;
  kind?: MediaKind;
  license?: MediaLicense;
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  primaryOnly?: boolean;
  search?: string;
}

export interface MediaStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  total_bytes: number;
  with_cdn: number;
  primary: number;
}

function buildMediaWhere(filter: MediaFilter): { where: string; params: unknown[] } {
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filter.entityType) {
    params.push(filter.entityType);
    where.push(`m.entity_type = $${params.length}::content.entity_type`);
  }
  if (filter.kind) {
    params.push(filter.kind);
    where.push(`m.kind = $${params.length}::content.media_kind`);
  }
  if (filter.license) {
    params.push(filter.license);
    where.push(`m.license = $${params.length}::content.media_license`);
  }
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`m.content_status = $${params.length}::content.content_status`);
  }
  if (filter.primaryOnly) where.push(`m.is_primary`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const i = params.length;
    where.push(`(m.alt_text ILIKE $${i} OR m.caption ILIKE $${i} OR m.photographer ILIKE $${i} OR m.storage_key ILIKE $${i})`);
  }
  return { where: where.join(' AND '), params };
}

/**
 * Looks up the display name of a media row's target entity. Joins against
 * every known content table that the polymorphic edge can point at.
 *
 * Implemented as a CASE chain so this stays a single round-trip per page
 * (versus one query per entity_type).
 */
const MEDIA_ENTITY_NAME_EXPR = `
  CASE m.entity_type
    WHEN 'locality'             THEN (SELECT name_en FROM content.locality          WHERE id = m.entity_id)
    WHEN 'trek_route'           THEN (SELECT name_en FROM content.trek_route        WHERE id = m.entity_id)
    WHEN 'waypoint'             THEN (SELECT name_en FROM content.waypoint          WHERE id = m.entity_id)
    WHEN 'heritage_site'        THEN (SELECT name_en FROM content.heritage_site     WHERE id = m.entity_id)
    WHEN 'dzong'                THEN (SELECT name_en FROM content.dzong             WHERE id = m.entity_id)
    WHEN 'dzong_lhakhang'       THEN (SELECT name_en FROM content.dzong_lhakhang    WHERE id = m.entity_id)
    WHEN 'health_center'        THEN (SELECT name_en FROM content.health_center     WHERE id = m.entity_id)
    WHEN 'school'               THEN (SELECT name    FROM content.school            WHERE id = m.entity_id)
    WHEN 'conservation_area'    THEN (SELECT name_en FROM content.conservation_area WHERE id = m.entity_id)
    WHEN 'biological_corridor'  THEN (SELECT name_en FROM content.conservation_area WHERE id = m.entity_id)
    WHEN 'festival'             THEN (SELECT name_en FROM content.festival          WHERE id = m.entity_id)
    WHEN 'thangka'              THEN (SELECT name_en FROM content.thangka           WHERE id = m.entity_id)
    WHEN 'cuisine_item'         THEN (SELECT name_en FROM content.cuisine_item      WHERE id = m.entity_id)
    WHEN 'cuisine_ingredient'   THEN (SELECT name_en FROM content.cuisine_ingredient WHERE id = m.entity_id)
    WHEN 'species'              THEN (SELECT COALESCE(common_name_en, scientific_name) FROM content.species WHERE id = m.entity_id)
    WHEN 'historical_figure'    THEN (SELECT name_en FROM content.historical_figure WHERE id = m.entity_id)
    WHEN 'zorig_chusum'         THEN (SELECT name_en FROM content.zorig_chusum      WHERE id = m.entity_id)
    WHEN 'national_symbol'      THEN (SELECT name_en FROM content.national_symbol   WHERE id = m.entity_id)
    WHEN 'cultural_custom'      THEN (SELECT title_en FROM content.cultural_custom  WHERE id = m.entity_id)
    WHEN 'traditional_game'     THEN (SELECT name_en FROM content.traditional_game  WHERE id = m.entity_id)
  END
`;

export async function getMediaItems(filter: MediaFilter = {}, limit = 60, offset = 0): Promise<MediaItem[]> {
  const { where, params } = buildMediaWhere(filter);
  params.push(limit, offset);
  const r = await q(`
    SELECT
      m.id,
      m.entity_type::text   AS entity_type,
      m.entity_id,
      ${MEDIA_ENTITY_NAME_EXPR} AS entity_name,
      m.kind::text          AS kind,
      m.storage_key,
      m.cdn_url,
      m.mime_type,
      m.byte_size,
      m.width_px,
      m.height_px,
      m.duration_s,
      m.alt_text,
      m.caption,
      m.sort_order,
      (m.is_primary)::int   AS is_primary,
      m.photographer,
      m.license::text       AS license,
      m.license_notes,
      m.taken_at,
      m.content_status::text AS content_status,
      m.updated_at
    FROM content.media m
    WHERE ${where}
    ORDER BY m.is_primary DESC, m.updated_at DESC NULLS LAST, m.id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows.map(row => ({
    ...row,
    taken_at:   iso(row.taken_at),
    updated_at: iso(row.updated_at),
  })) as MediaItem[];
}

export async function getMediaCount(filter: MediaFilter = {}): Promise<number> {
  const { where, params } = buildMediaWhere(filter);
  const r = await q(`SELECT COUNT(*)::int AS n FROM content.media m WHERE ${where}`, params);
  return r.rows[0].n;
}

export async function getMediaStatusCounts(): Promise<MediaStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COALESCE(SUM(byte_size), 0)::bigint                        AS total_bytes,
      COUNT(*) FILTER (WHERE cdn_url IS NOT NULL)::int           AS with_cdn,
      COUNT(*) FILTER (WHERE is_primary)::int                    AS primary
    FROM content.media
  `);
  const row = r.rows[0];
  return {
    draft: row.draft,
    in_review: row.in_review,
    published: row.published,
    archived: row.archived,
    total: row.total,
    total_bytes: Number(row.total_bytes),
    with_cdn: row.with_cdn,
    primary: row.primary,
  };
}

/** All media for one specific entity, gallery-ordered (hero first, then sort_order). */
export async function getMediaForEntity(entityType: MediaEntityType, entityId: number): Promise<MediaItem[]> {
  const r = await q(`
    SELECT
      m.id,
      m.entity_type::text   AS entity_type,
      m.entity_id,
      ${MEDIA_ENTITY_NAME_EXPR} AS entity_name,
      m.kind::text          AS kind,
      m.storage_key,
      m.cdn_url,
      m.mime_type,
      m.byte_size,
      m.width_px,
      m.height_px,
      m.duration_s,
      m.alt_text,
      m.caption,
      m.sort_order,
      (m.is_primary)::int   AS is_primary,
      m.photographer,
      m.license::text       AS license,
      m.license_notes,
      m.taken_at,
      m.content_status::text AS content_status,
      m.updated_at
    FROM content.media m
    WHERE m.entity_type = $1::content.entity_type AND m.entity_id = $2
    ORDER BY m.is_primary DESC, m.sort_order ASC, m.id ASC
  `, [entityType, entityId]);
  return r.rows.map(row => ({
    ...row,
    taken_at:   iso(row.taken_at),
    updated_at: iso(row.updated_at),
  })) as MediaItem[];
}

export async function getMediaEntityTypeCounts(): Promise<Array<{ entity_type: MediaEntityType; count: number }>> {
  const r = await q(`
    SELECT entity_type::text AS entity_type, COUNT(*)::int AS count
    FROM content.media
    GROUP BY entity_type
    ORDER BY count DESC
  `);
  return r.rows as Array<{ entity_type: MediaEntityType; count: number }>;
}

// ── heritage sites ──────────────────────────────────────────────────────────
const HERITAGE_SELECT = `
  SELECT
    h.id,
    h.name_en                                       AS name,
    h.name_dz,
    h.name_romanized,
    h.slug,
    h.description,
    COALESCE(ht.label_en, ht.code)                  AS type,
    ht.code                                         AS type_code,
    COALESCE(d.name_en, '')                         AS district,
    COALESCE(g.name_en, '')                         AS gewog,
    COALESCE(c.name_en, '')                         AS chiwog,
    h.elevation_m,
    h.built_year,
    h.built_year_approx,
    COALESCE(figure.name_en, h.built_by_text)       AS built_by,
    h.significance,
    p.label_en                                      AS period,
    h.conservation_status::text                     AS conservation_status,
    h.access_status::text                           AS access_status,
    h.visitor_info,
    CASE WHEN jsonb_typeof(h.fees) = 'array' THEN h.fees ELSE NULL END AS fees,
    CASE WHEN jsonb_typeof(h.opening_hours) = 'object' THEN h.opening_hours ELSE NULL END AS opening_hours,
    (h.fees->0->>'amount')                          AS entry_fee,
    h.opening_hours::text                           AS open_hours,
    h.registered_id,
    h.nearest_trek_route_id,
    tr.name_en                                      AS nearest_trek_route_name,
    (h.is_accessible_from_trail)::int               AS is_accessible_from_trail,
    h.content_status::text                          AS content_status,
    h.updated_at                                    AS updated_at,
    h.heritage_type_id,
    h.period_id,
    h.founder_figure_id
  FROM content.heritage_site h
  LEFT JOIN ref.heritage_type     ht ON ht.id = h.heritage_type_id
  LEFT JOIN ref.historical_period p  ON p.id  = h.period_id
  LEFT JOIN content.historical_figure figure ON figure.id = h.founder_figure_id
  LEFT JOIN ref.dzongkhag d ON d.id = h.dzongkhag_id
  LEFT JOIN ref.gewog     g ON g.id = h.gewog_id
  LEFT JOIN ref.chiwog    c ON c.id = h.chiwog_id
  LEFT JOIN content.trek_route tr ON tr.id = h.nearest_trek_route_id
`;

export async function getHeritageSites(limit = 200, offset = 0, district?: string): Promise<HeritageSite[]> {
  const where = district ? `WHERE d.name_en = $3` : '';
  const params: unknown[] = district ? [limit, offset, district] : [limit, offset];
  const r = await q(`${HERITAGE_SELECT} ${where}
    ORDER BY COALESCE(d.name_en, ''), h.name_en
    LIMIT $1 OFFSET $2`, params);
  return r.rows as HeritageSite[];
}

export async function getHeritageSiteById(id: number): Promise<HeritageSite | null> {
  const r = await q(`${HERITAGE_SELECT} WHERE h.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as HeritageSite;
}

// Reference options for FK dropdowns on heritage forms.
export interface RefOption { id: number; code: string | null; label: string; }

export async function getHeritageTypeOptions(): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, code, COALESCE(label_en, code) AS label
    FROM ref.heritage_type
    ORDER BY sort_order, label_en
  `);
  return r.rows as RefOption[];
}

export async function getHistoricalPeriodOptions(): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, code, COALESCE(label_en, code) AS label
    FROM ref.historical_period
    ORDER BY sort_order, start_year NULLS LAST, label_en
  `);
  return r.rows as RefOption[];
}

// ── reference table editors (full rows) ─────────────────────────────────────
export interface RefWaypointType {
  id: number;
  code: string;
  label_en: string;
  label_dz: string | null;
  description: string | null;
  category: 'trail'|'water'|'landmark'|'facility'|'cultural'|'nature'|'infrastructure'|'safety';
  icon: string | null;
  color: string | null;
  min_zoom: number;
  show_in_app: boolean;
  sort_order: number;
  usage_count: number;
}
export async function getRefWaypointTypes(): Promise<RefWaypointType[]> {
  const r = await q(`
    SELECT wt.id, wt.code, wt.label_en, wt.label_dz, wt.description,
           wt.category::text AS category, wt.icon, wt.color, wt.min_zoom,
           wt.show_in_app, wt.sort_order,
           (SELECT COUNT(*)::int FROM content.waypoint w WHERE w.waypoint_type_id = wt.id) AS usage_count
      FROM ref.waypoint_type wt
     ORDER BY wt.sort_order, wt.label_en
  `);
  return r.rows as RefWaypointType[];
}

export interface RefHeritageType {
  id: number; code: string; label_en: string; label_dz: string | null;
  description: string | null; icon: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefHeritageTypes(): Promise<RefHeritageType[]> {
  const r = await q(`
    SELECT ht.id, ht.code, ht.label_en, ht.label_dz, ht.description, ht.icon, ht.sort_order,
           (SELECT COUNT(*)::int FROM content.heritage_site h WHERE h.heritage_type_id = ht.id) AS usage_count
      FROM ref.heritage_type ht
     ORDER BY ht.sort_order, ht.label_en
  `);
  return r.rows as RefHeritageType[];
}

export interface RefHistoricalPeriod {
  id: number; code: string; label_en: string; label_dz: string | null;
  description: string | null;
  start_year: number | null; end_year: number | null; sort_order: number;
  usage_count: number;
}
export async function getRefHistoricalPeriods(): Promise<RefHistoricalPeriod[]> {
  const r = await q(`
    SELECT hp.id, hp.code, hp.label_en, hp.label_dz, hp.description,
           hp.start_year, hp.end_year, hp.sort_order,
           (SELECT COUNT(*)::int FROM content.historical_figure hf WHERE hf.period_id = hp.id) AS usage_count
      FROM ref.historical_period hp
     ORDER BY hp.sort_order, hp.start_year NULLS LAST, hp.label_en
  `);
  return r.rows as RefHistoricalPeriod[];
}

export interface RefFestivalType {
  id: number; code: string; label_en: string; label_dz: string | null;
  description: string | null; is_religious: boolean; icon: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefFestivalTypes(): Promise<RefFestivalType[]> {
  const r = await q(`
    SELECT ft.id, ft.code, ft.label_en, ft.label_dz, ft.description,
           ft.is_religious, ft.icon, ft.sort_order,
           (SELECT COUNT(*)::int FROM content.festival f WHERE f.festival_type_id = ft.id) AS usage_count
      FROM ref.festival_type ft
     ORDER BY ft.sort_order, ft.label_en
  `);
  return r.rows as RefFestivalType[];
}

export interface RefCuisineCategory {
  id: number; code: string; label_en: string; label_dz: string | null;
  description: string | null; icon: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefCuisineCategories(): Promise<RefCuisineCategory[]> {
  const r = await q(`
    SELECT cc.id, cc.code, cc.label_en, cc.label_dz, cc.description, cc.icon, cc.sort_order,
           (SELECT COUNT(*)::int FROM content.cuisine_item ci WHERE ci.category_id = cc.id) AS usage_count
      FROM ref.cuisine_category cc
     ORDER BY cc.sort_order, cc.label_en
  `);
  return r.rows as RefCuisineCategory[];
}

export interface RefHealthService {
  id: number; code: string; label_en: string; label_dz: string | null;
  description: string | null; is_emergency: boolean; sort_order: number;
  usage_count: number;
}
export async function getRefHealthServices(): Promise<RefHealthService[]> {
  const r = await q(`
    SELECT hs.id, hs.code, hs.label_en, hs.label_dz, hs.description,
           hs.is_emergency, hs.sort_order,
           (SELECT COUNT(*)::int FROM content.health_center_service hcs WHERE hcs.service_id = hs.id) AS usage_count
      FROM ref.health_service hs
     ORDER BY hs.sort_order, hs.label_en
  `);
  return r.rows as RefHealthService[];
}

export interface RefHealthCenterType {
  id: number; code: string; label_en: string; label_dz: string | null;
  full_form: string | null; description: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefHealthCenterTypes(): Promise<RefHealthCenterType[]> {
  const r = await q(`
    SELECT t.id, t.code, t.label_en, t.label_dz, t.full_form, t.description, t.sort_order,
           (SELECT COUNT(*)::int FROM content.health_center hc WHERE hc.type_id = t.id) AS usage_count
      FROM ref.health_center_type t
     ORDER BY t.sort_order, t.label_en
  `);
  return r.rows as RefHealthCenterType[];
}

export interface RefConservationStatus {
  id: number; code: string; label_en: string; label_dz: string | null;
  full_form: string | null; description: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefConservationStatus(): Promise<RefConservationStatus[]> {
  const r = await q(`
    SELECT t.id, t.code, t.label_en, t.label_dz, t.full_form, t.description, t.sort_order,
           (SELECT COUNT(*)::int FROM content.species s WHERE s.conservation_status_iucn_id = t.id) AS usage_count
      FROM ref.conservation_status t
     ORDER BY t.sort_order, t.label_en
  `);
  return r.rows as RefConservationStatus[];
}

export interface RefObservationCategory {
  id: number; code: string; label_en: string; label_dz: string | null;
  full_form: string | null; description: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefObservationCategory(): Promise<RefObservationCategory[]> {
  const r = await q(`
    SELECT t.id, t.code, t.label_en, t.label_dz, t.full_form, t.description, t.sort_order,
           (SELECT COUNT(*)::int FROM content.species_occurrence o WHERE o.category_id = t.id) AS usage_count
      FROM ref.observation_category t
     ORDER BY t.sort_order, t.label_en
  `);
  return r.rows as RefObservationCategory[];
}

export interface RefSchoolCategory {
  id: number; code: string; label_en: string; label_dz: string | null;
  full_form: string | null; description: string | null; sort_order: number;
  usage_count: number;
}
export async function getRefSchoolCategory(): Promise<RefSchoolCategory[]> {
  const r = await q(`
    SELECT t.id, t.code, t.label_en, t.label_dz, t.full_form, t.description, t.sort_order,
           (SELECT COUNT(*)::int FROM content.school s WHERE s.category_id = t.id) AS usage_count
      FROM ref.school_category t
     ORDER BY t.sort_order, t.label_en
  `);
  return r.rows as RefSchoolCategory[];
}

export interface RefTableSummary {
  key: string;
  schema: string;
  table: string;
  total: number;
  in_use: number;
}

export async function getRefTableSummaries(): Promise<RefTableSummary[]> {
  const r = await q(`
    SELECT 'waypoint_type'     AS key, 'ref' AS schema, 'waypoint_type' AS "table",
           (SELECT COUNT(*)::int FROM ref.waypoint_type) AS total,
           (SELECT COUNT(DISTINCT waypoint_type_id)::int FROM content.waypoint WHERE waypoint_type_id IS NOT NULL) AS in_use
    UNION ALL
    SELECT 'heritage_type', 'ref', 'heritage_type',
           (SELECT COUNT(*)::int FROM ref.heritage_type),
           (SELECT COUNT(DISTINCT heritage_type_id)::int FROM content.heritage_site WHERE heritage_type_id IS NOT NULL)
    UNION ALL
    SELECT 'historical_period', 'ref', 'historical_period',
           (SELECT COUNT(*)::int FROM ref.historical_period),
           (SELECT COUNT(DISTINCT period_id)::int FROM content.historical_figure WHERE period_id IS NOT NULL)
    UNION ALL
    SELECT 'festival_type', 'ref', 'festival_type',
           (SELECT COUNT(*)::int FROM ref.festival_type),
           (SELECT COUNT(DISTINCT festival_type_id)::int FROM content.festival WHERE festival_type_id IS NOT NULL)
    UNION ALL
    SELECT 'cuisine_category', 'ref', 'cuisine_category',
           (SELECT COUNT(*)::int FROM ref.cuisine_category),
           (SELECT COUNT(DISTINCT category_id)::int FROM content.cuisine_item WHERE category_id IS NOT NULL)
    UNION ALL
    SELECT 'health_service', 'ref', 'health_service',
           (SELECT COUNT(*)::int FROM ref.health_service),
           (SELECT COUNT(DISTINCT service_id)::int FROM content.health_center_service)
    UNION ALL
    SELECT 'health_center_type', 'ref', 'health_center_type',
           (SELECT COUNT(*)::int FROM ref.health_center_type),
           (SELECT COUNT(DISTINCT type_id)::int FROM content.health_center WHERE type_id IS NOT NULL)
    UNION ALL
    SELECT 'conservation_status', 'ref', 'conservation_status',
           (SELECT COUNT(*)::int FROM ref.conservation_status),
           (SELECT COUNT(DISTINCT conservation_status_iucn_id)::int FROM content.species WHERE conservation_status_iucn_id IS NOT NULL)
    UNION ALL
    SELECT 'observation_category', 'ref', 'observation_category',
           (SELECT COUNT(*)::int FROM ref.observation_category),
           (SELECT COUNT(DISTINCT category_id)::int FROM content.species_occurrence WHERE category_id IS NOT NULL)
    UNION ALL
    SELECT 'school_category', 'ref', 'school_category',
           (SELECT COUNT(*)::int FROM ref.school_category),
           (SELECT COUNT(DISTINCT category_id)::int FROM content.school WHERE category_id IS NOT NULL)
    UNION ALL
    SELECT 'dzongkhag', 'ref', 'dzongkhag',
           (SELECT COUNT(*)::int FROM ref.dzongkhag),
           (SELECT COUNT(DISTINCT dzongkhag_id)::int FROM ref.gewog WHERE dzongkhag_id IS NOT NULL)
  `);
  return r.rows as RefTableSummary[];
}

export async function getDzongkhagOptions(): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, code, name_en AS label
    FROM ref.dzongkhag
    ORDER BY name_en
  `);
  return r.rows as RefOption[];
}

export async function getHistoricalFigureOptions(limit = 200): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, NULL::text AS code, name_en AS label
    FROM content.historical_figure
    ORDER BY name_en
    LIMIT $1
  `, [limit]);
  return r.rows as RefOption[];
}

// ── historical figures (full editor) ────────────────────────────────────────
export interface HistoricalFigure {
  id: number;
  slug: string | null;
  name_en: string;
  name_dz: string | null;
  honorific: string | null;
  role: string | null;
  period_id: number | null;
  period_label: string | null;
  birth_year: number | null;
  death_year: number | null;
  short_bio: string | null;
  significance: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  /** How many heritage sites name this figure as founder. */
  heritage_count: number;
  /** How many dzongs name this figure as founder. */
  dzong_count: number;
  /** How many festivals link to this figure. */
  festival_count: number;
}

export interface HistoricalFigureFilter {
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  periodId?: number;
  search?: string;
}

export interface HistoricalFigureStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
}

const HISTORICAL_FIGURE_SELECT = `
  SELECT
    hf.id,
    hf.slug,
    hf.name_en,
    hf.name_dz,
    hf.honorific,
    hf.role,
    hf.period_id,
    hp.label_en                AS period_label,
    hf.birth_year,
    hf.death_year,
    hf.short_bio,
    hf.significance,
    hf.content_status::text    AS content_status,
    hf.updated_at,
    (SELECT COUNT(*)::int FROM content.heritage_site h WHERE h.founder_figure_id = hf.id) AS heritage_count,
    (SELECT COUNT(*)::int FROM content.dzong         dz WHERE dz.founder_figure_id = hf.id) AS dzong_count,
    (SELECT COUNT(*)::int FROM content.festival_figure ff WHERE ff.figure_id = hf.id) AS festival_count
  FROM content.historical_figure hf
  LEFT JOIN ref.historical_period hp ON hp.id = hf.period_id
`;

export async function getHistoricalFigures(filter: HistoricalFigureFilter = {}, limit = 500, offset = 0): Promise<HistoricalFigure[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`hf.content_status = $${params.length}::content.content_status`);
  }
  if (filter.periodId) {
    params.push(filter.periodId);
    where.push(`hf.period_id = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(hf.name_en ILIKE $${params.length} OR hf.name_dz ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const r = await q(`${HISTORICAL_FIGURE_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY hf.birth_year NULLS LAST, hf.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as HistoricalFigure[];
}

export async function getHistoricalFigureById(id: number): Promise<HistoricalFigure | null> {
  const r = await q(`${HISTORICAL_FIGURE_SELECT} WHERE hf.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as HistoricalFigure;
}

export async function getHistoricalFigureStatusCounts(): Promise<HistoricalFigureStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total
    FROM content.historical_figure
  `);
  return r.rows[0] as HistoricalFigureStatusCounts;
}

// ── thangkas (full editor) ──────────────────────────────────────────────────
export type ThangkaStyle =
  | 'religious_painted' | 'religious_appliqué' | 'religious_embroidered'
  | 'thongdrol' | 'mandala' | 'lineage_portrait' | 'other';

export interface Thangka {
  id: number;
  slug: string | null;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  style: ThangkaStyle;
  is_thongdrol: number;
  depicts: string | null;
  iconographic_notes: string | null;
  meaning: string | null;
  significance: string | null;
  folklore: string | null;
  height_cm: number | null;
  width_cm: number | null;
  materials: string | null;
  commissioned_year: number | null;
  commissioned_by_figure_id: number | null;
  commissioned_by_figure_name: string | null;
  artist_attribution: string | null;
  origin_dzong_id: number | null;
  origin_dzong_name: string | null;
  origin_heritage_site_id: number | null;
  origin_heritage_site_name: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  festival_display_count: number;
}

export interface ThangkaFilter {
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  style?: ThangkaStyle;
  thongdrolOnly?: boolean;
  search?: string;
}

export interface ThangkaStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  thongdrol: number;
}

const THANGKA_SELECT = `
  SELECT
    t.id,
    t.slug,
    t.name_en,
    t.name_dz,
    t.name_romanized,
    t.style::text                AS style,
    (t.is_thongdrol)::int        AS is_thongdrol,
    t.depicts,
    t.iconographic_notes,
    t.meaning,
    t.significance,
    t.folklore,
    t.height_cm,
    t.width_cm,
    t.materials,
    t.commissioned_year,
    t.commissioned_by_figure_id,
    hf.name_en                   AS commissioned_by_figure_name,
    t.artist_attribution,
    t.origin_dzong_id,
    dz.name_en                   AS origin_dzong_name,
    t.origin_heritage_site_id,
    hs.name_en                   AS origin_heritage_site_name,
    t.content_status::text       AS content_status,
    t.updated_at,
    (SELECT COUNT(*)::int FROM content.festival_thangka_display ftd WHERE ftd.thangka_id = t.id) AS festival_display_count
  FROM content.thangka t
  LEFT JOIN content.historical_figure hf ON hf.id = t.commissioned_by_figure_id
  LEFT JOIN content.dzong              dz ON dz.id = t.origin_dzong_id
  LEFT JOIN content.heritage_site      hs ON hs.id = t.origin_heritage_site_id
`;

export async function getThangkas(filter: ThangkaFilter = {}, limit = 500, offset = 0): Promise<Thangka[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`t.content_status = $${params.length}::content.content_status`);
  }
  if (filter.style) {
    params.push(filter.style);
    where.push(`t.style = $${params.length}::content.thangka_style`);
  }
  if (filter.thongdrolOnly) where.push(`t.is_thongdrol`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(t.name_en ILIKE $${params.length} OR t.name_dz ILIKE $${params.length} OR t.depicts ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const r = await q(`${THANGKA_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.is_thongdrol DESC, t.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as Thangka[];
}

export async function getThangkaById(id: number): Promise<Thangka | null> {
  const r = await q(`${THANGKA_SELECT} WHERE t.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as Thangka;
}

export async function getThangkaStatusCounts(): Promise<ThangkaStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE is_thongdrol)::int                  AS thongdrol
    FROM content.thangka
  `);
  return r.rows[0] as ThangkaStatusCounts;
}

export interface ThangkaFestivalDisplay {
  festival_id: number;
  festival_name: string;
  day_of_festival: number | null;
  time_of_day: string | null;
  display_duration_min: number | null;
  notes: string | null;
}

export async function getThangkaFestivalDisplays(thangkaId: number): Promise<ThangkaFestivalDisplay[]> {
  const r = await q(`
    SELECT
      ftd.festival_id,
      f.name_en                                       AS festival_name,
      ftd.day_of_festival,
      to_char(ftd.time_of_day, 'HH24:MI')             AS time_of_day,
      ftd.display_duration_min,
      ftd.notes
    FROM content.festival_thangka_display ftd
    JOIN content.festival f ON f.id = ftd.festival_id
    WHERE ftd.thangka_id = $1
    ORDER BY f.name_en
  `, [thangkaId]);
  return r.rows as ThangkaFestivalDisplay[];
}

export async function getDzongOptions(limit = 500): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, slug AS code, name_en AS label
    FROM content.dzong
    ORDER BY name_en
    LIMIT $1
  `, [limit]);
  return r.rows as RefOption[];
}

export async function getHeritageSiteOptions(limit = 1000): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, slug AS code, name_en AS label
    FROM content.heritage_site
    ORDER BY name_en
    LIMIT $1
  `, [limit]);
  return r.rows as RefOption[];
}

// ── cuisine ingredients (full editor) ───────────────────────────────────────
export interface CuisineIngredientFull {
  id: number;
  slug: string | null;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  description: string | null;
  notes: string | null;
  species_id: number | null;
  species_name: string | null;
  is_local: number;
  is_seasonal: number;
  season_months: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  dish_count: number;
}

export interface CuisineIngredientFilter {
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  localOnly?: boolean;
  seasonalOnly?: boolean;
  search?: string;
}

export interface CuisineIngredientStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  local: number;
  seasonal: number;
}

const CUISINE_INGREDIENT_SELECT = `
  SELECT
    ci.id,
    ci.slug,
    ci.name_en,
    ci.name_dz,
    ci.name_romanized,
    ci.description,
    ci.notes,
    ci.species_id,
    s.common_name_en             AS species_name,
    (ci.is_local)::int           AS is_local,
    (ci.is_seasonal)::int        AS is_seasonal,
    ci.season_months,
    ci.content_status::text      AS content_status,
    ci.updated_at,
    (SELECT COUNT(*)::int FROM content.cuisine_item_ingredient cii WHERE cii.ingredient_id = ci.id) AS dish_count
  FROM content.cuisine_ingredient ci
  LEFT JOIN content.species s ON s.id = ci.species_id
`;

export async function getCuisineIngredients(filter: CuisineIngredientFilter = {}, limit = 500, offset = 0): Promise<CuisineIngredientFull[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`ci.content_status = $${params.length}::content.content_status`);
  }
  if (filter.localOnly)    where.push(`ci.is_local`);
  if (filter.seasonalOnly) where.push(`ci.is_seasonal`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(ci.name_en ILIKE $${params.length} OR ci.name_dz ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const r = await q(`${CUISINE_INGREDIENT_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ci.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as CuisineIngredientFull[];
}

export async function getCuisineIngredientById(id: number): Promise<CuisineIngredientFull | null> {
  const r = await q(`${CUISINE_INGREDIENT_SELECT} WHERE ci.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as CuisineIngredientFull;
}

export async function getCuisineIngredientStatusCounts(): Promise<CuisineIngredientStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE is_local)::int                      AS local,
      COUNT(*) FILTER (WHERE is_seasonal)::int                   AS seasonal
    FROM content.cuisine_ingredient
  `);
  return r.rows[0] as CuisineIngredientStatusCounts;
}

export interface CuisineIngredientDish {
  cuisine_item_id: number;
  cuisine_item_name: string;
  is_optional: number;
  is_garnish: number;
  quantity_notes: string | null;
}

export async function getCuisineIngredientDishes(ingredientId: number): Promise<CuisineIngredientDish[]> {
  const r = await q(`
    SELECT
      cii.cuisine_item_id,
      ci.name_en                AS cuisine_item_name,
      (cii.is_optional)::int    AS is_optional,
      (cii.is_garnish)::int     AS is_garnish,
      cii.quantity_notes
    FROM content.cuisine_item_ingredient cii
    JOIN content.cuisine_item ci ON ci.id = cii.cuisine_item_id
    WHERE cii.ingredient_id = $1
    ORDER BY ci.name_en
  `, [ingredientId]);
  return r.rows as CuisineIngredientDish[];
}

export async function getTrekRouteOptions(limit = 500): Promise<RefOption[]> {
  const r = await q(`
    SELECT id, slug AS code, name_en AS label
    FROM content.trek_route
    ORDER BY name_en
    LIMIT $1
  `, [limit]);
  return r.rows as RefOption[];
}

export async function getHeritageSiteTypes(): Promise<{ type: string; label: string; count: number }[]> {
  const r = await q(`
    SELECT
      ht.code                          AS type,
      COALESCE(ht.label_en, ht.code)   AS label,
      COUNT(*)::int                    AS count
    FROM content.heritage_site h
    JOIN ref.heritage_type ht ON ht.id = h.heritage_type_id
    GROUP BY ht.code, ht.label_en
    ORDER BY count DESC
  `);
  return r.rows as { type: string; label: string; count: number }[];
}

export interface HeritageStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
}

export async function getHeritageStatusCounts(): Promise<HeritageStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total
    FROM content.heritage_site
  `);
  return r.rows[0] as HeritageStatusCounts;
}

// ── conservation areas (non-corridor) ───────────────────────────────────────
export async function getConservationAreas(): Promise<ConservationArea[]> {
  const r = await q(`
    SELECT
      ca.id,
      ca.code,
      ca.pa_name,
      ca.name_en                                    AS name,
      ca.area_km2,
      ca.pa_type::text                              AS type,
      ca.established_year,
      ca.managing_authority,
      (ca.permit_required)::int                     AS permit_required,
      ca.permit_info,
      ca.key_species_notes                          AS key_species,
      ca.description
    FROM content.conservation_area ca
    WHERE ca.pa_type <> 'biological_corridor'
    ORDER BY ca.area_km2 DESC NULLS LAST
  `);
  return r.rows as ConservationArea[];
}

// ── administrative ──────────────────────────────────────────────────────────
export async function getDzongkhags(): Promise<Dzongkhag[]> {
  const r = await q(`
    SELECT
      d.id,
      d.name_en                                     AS name,
      d.name_dz,
      d.code,
      d.region::text                                AS region,
      COUNT(DISTINCT g.id)::int                     AS gewog_count,
      COUNT(DISTINCT c.id)::int                     AS chiwog_count,
      SUM(c.population)::int                        AS population_total
    FROM ref.dzongkhag d
    LEFT JOIN ref.gewog  g ON g.dzongkhag_id = d.id
    LEFT JOIN ref.chiwog c ON c.gewog_id     = g.id
    GROUP BY d.id, d.name_en, d.name_dz, d.code, d.region
    ORDER BY d.name_en
  `);
  return r.rows as Dzongkhag[];
}

export async function getGewogs(dzongkhagId?: number): Promise<Gewog[]> {
  const where = dzongkhagId ? `WHERE g.dzongkhag_id = $1` : '';
  const params: unknown[] = dzongkhagId ? [dzongkhagId] : [];
  const r = await q(`
    SELECT
      g.id,
      g.name_en                                     AS name,
      g.name_dz,
      g.code,
      g.dzongkhag_id,
      d.name_en                                     AS dzongkhag,
      COUNT(c.id)::int                              AS chiwog_count,
      SUM(c.population)::int                        AS population_total
    FROM ref.gewog g
    JOIN ref.dzongkhag d ON d.id = g.dzongkhag_id
    LEFT JOIN ref.chiwog c ON c.gewog_id = g.id
    ${where}
    GROUP BY g.id, g.name_en, g.name_dz, g.code, g.dzongkhag_id, d.name_en
    ORDER BY d.name_en, g.name_en
  `, params);
  return r.rows as Gewog[];
}

function buildChiwogWhere(filter: ChiwogFilter): { where: string; params: unknown[] } {
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filter.dzongkhag) {
    params.push(filter.dzongkhag);
    where.push(`d.name_en = $${params.length}`);
  }
  if (filter.gewog) {
    params.push(filter.gewog);
    where.push(`g.name_en = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const i = params.length;
    where.push(`(c.name_en ILIKE $${i} OR c.name_dz ILIKE $${i} OR c.nsb_code ILIKE $${i})`);
  }
  return { where: where.join(' AND '), params };
}

export async function getChiwogs(filter: ChiwogFilter = {}, limit = 100, offset = 0): Promise<Chiwog[]> {
  const { where, params } = buildChiwogWhere(filter);
  params.push(limit, offset);
  const r = await q(`
    SELECT
      c.id,
      c.name_en                                     AS name,
      c.name_dz,
      c.nsb_code,
      c.gewog_id,
      g.name_en                                     AS gewog,
      d.name_en                                     AS dzongkhag,
      c.population,
      c.population_year
    FROM ref.chiwog c
    JOIN ref.gewog g       ON g.id = c.gewog_id
    JOIN ref.dzongkhag d   ON d.id = g.dzongkhag_id
    WHERE ${where}
    ORDER BY d.name_en, g.name_en, c.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows as Chiwog[];
}

export async function getChiwogCount(filter: ChiwogFilter = {}): Promise<number> {
  const { where, params } = buildChiwogWhere(filter);
  const r = await q(`
    SELECT COUNT(*)::int AS n
    FROM ref.chiwog c
    JOIN ref.gewog g     ON g.id = c.gewog_id
    JOIN ref.dzongkhag d ON d.id = g.dzongkhag_id
    WHERE ${where}
  `, params);
  return r.rows[0].n;
}

export async function getDistrictList(): Promise<string[]> {
  const r = await q(`SELECT name_en FROM ref.dzongkhag ORDER BY name_en`);
  return r.rows.map(row => row.name_en as string);
}

// ── admin users ─────────────────────────────────────────────────────────────
export type AdminRole = 'editor' | 'reviewer' | 'publisher' | 'admin';

export interface AdminUser {
  id: number;
  public_id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: number;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUserCounts {
  total: number;
  active: number;
  editor: number;
  reviewer: number;
  publisher: number;
  admin: number;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const r = await q(`
    SELECT
      id,
      public_id::text         AS public_id,
      email,
      full_name,
      role,
      (is_active)::int        AS is_active,
      last_login_at,
      created_at,
      updated_at
    FROM admin.users
    ORDER BY full_name
  `);
  return r.rows.map(row => ({
    ...row,
    last_login_at: iso(row.last_login_at),
    created_at:    iso(row.created_at),
    updated_at:    iso(row.updated_at),
  })) as AdminUser[];
}

export interface ActivityEntry {
  entity_type: string;
  entity_id: number;
  entity_name: string | null;
  /** 'created' if created_at === updated_at, else 'updated'. */
  action: 'created' | 'updated';
  actor_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  occurred_at: string;
  content_status: 'draft' | 'in_review' | 'published' | 'archived' | null;
}

export interface ActivityFilter {
  entityType?: string;
  actorId?: number;
  action?: 'created' | 'updated';
  /** ISO date inclusive. */
  since?: string;
  /** ISO date inclusive. */
  until?: string;
}

/**
 * Unified recent-activity feed across every content table with a
 * created_at/updated_at + created_by/updated_by tuple. The schema has no
 * dedicated audit_log table, so field-level diff history isn't available.
 *
 * Each table contributes two rows per source row: a 'created' marker keyed on
 * created_at + created_by, and an 'updated' marker keyed on updated_at +
 * updated_by — but only when updated_at differs from created_at (so we don't
 * surface a noisy "updated" line for every brand-new row).
 */
const ACTIVITY_TABLES: Array<{ entity: string; table: string; nameExpr: string; statusCol: boolean }> = [
  { entity: 'trek_route',          table: 'content.trek_route',        nameExpr: 'name_en',  statusCol: true },
  { entity: 'waypoint',            table: 'content.waypoint',          nameExpr: 'name_en',  statusCol: true },
  { entity: 'heritage_site',       table: 'content.heritage_site',     nameExpr: 'name_en',  statusCol: true },
  { entity: 'dzong',               table: 'content.dzong',             nameExpr: 'name_en',  statusCol: true },
  { entity: 'dzong_lhakhang',      table: 'content.dzong_lhakhang',    nameExpr: 'name_en',  statusCol: true },
  { entity: 'festival',            table: 'content.festival',          nameExpr: 'name_en',  statusCol: true },
  { entity: 'thangka',             table: 'content.thangka',           nameExpr: 'name_en',  statusCol: true },
  { entity: 'species',             table: 'content.species',           nameExpr: 'COALESCE(common_name_en, scientific_name)', statusCol: true },
  { entity: 'historical_figure',   table: 'content.historical_figure', nameExpr: 'name_en',  statusCol: true },
  { entity: 'conservation_area',   table: 'content.conservation_area', nameExpr: 'name_en',  statusCol: true },
  { entity: 'health_center',       table: 'content.health_center',     nameExpr: 'name_en',  statusCol: true },
  { entity: 'school',              table: 'content.school',            nameExpr: 'name',     statusCol: true },
  { entity: 'locality',            table: 'content.locality',          nameExpr: 'name_en',  statusCol: true },
  { entity: 'cuisine_item',        table: 'content.cuisine_item',      nameExpr: 'name_en',  statusCol: true },
  { entity: 'cuisine_ingredient',  table: 'content.cuisine_ingredient', nameExpr: 'name_en', statusCol: true },
  { entity: 'zorig_chusum',        table: 'content.zorig_chusum',      nameExpr: 'name_en',  statusCol: true },
  { entity: 'national_symbol',     table: 'content.national_symbol',   nameExpr: 'name_en',  statusCol: true },
  { entity: 'cultural_custom',     table: 'content.cultural_custom',   nameExpr: 'title_en', statusCol: true },
  { entity: 'traditional_game',    table: 'content.traditional_game',  nameExpr: 'name_en',  statusCol: true },
  { entity: 'media',               table: 'content.media',             nameExpr: 'COALESCE(alt_text, storage_key)', statusCol: true },
];

function buildActivityUnion(): string {
  return ACTIVITY_TABLES.map(t => {
    const status = t.statusCol ? 't.content_status::text' : 'NULL::text';
    return `
      SELECT
        '${t.entity}'::text AS entity_type,
        t.id                AS entity_id,
        (${t.nameExpr})     AS entity_name,
        'created'::text     AS action,
        t.created_by        AS actor_id,
        t.created_at        AS occurred_at,
        ${status}           AS content_status
      FROM ${t.table} t
      UNION ALL
      SELECT
        '${t.entity}'::text AS entity_type,
        t.id                AS entity_id,
        (${t.nameExpr})     AS entity_name,
        'updated'::text     AS action,
        t.updated_by        AS actor_id,
        t.updated_at        AS occurred_at,
        ${status}           AS content_status
      FROM ${t.table} t
      WHERE t.updated_at <> t.created_at
    `;
  }).join('\nUNION ALL\n');
}

export async function getActivityFeed(filter: ActivityFilter = {}, limit = 100, offset = 0): Promise<ActivityEntry[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.entityType) {
    params.push(filter.entityType);
    where.push(`a.entity_type = $${params.length}`);
  }
  if (filter.actorId != null) {
    params.push(filter.actorId);
    where.push(`a.actor_id = $${params.length}`);
  }
  if (filter.action) {
    params.push(filter.action);
    where.push(`a.action = $${params.length}`);
  }
  if (filter.since) {
    params.push(filter.since);
    where.push(`a.occurred_at >= $${params.length}::timestamptz`);
  }
  if (filter.until) {
    params.push(filter.until);
    where.push(`a.occurred_at <= $${params.length}::timestamptz + interval '1 day'`);
  }
  params.push(limit, offset);
  const r = await q(`
    SELECT
      a.entity_type,
      a.entity_id,
      a.entity_name,
      a.action,
      a.actor_id,
      u.full_name  AS actor_name,
      u.email      AS actor_email,
      a.occurred_at,
      a.content_status
    FROM (
      ${buildActivityUnion()}
    ) a
    LEFT JOIN admin.users u ON u.id = a.actor_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.occurred_at DESC NULLS LAST
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows.map(row => ({
    ...row,
    occurred_at: iso(row.occurred_at),
  })) as ActivityEntry[];
}

export async function getActivityEntityTypes(): Promise<string[]> {
  // Returns the entity types that actually have at least one tracked row;
  // saves a 20-table UNION for a dropdown when most are empty.
  const queries = ACTIVITY_TABLES.map(t => `
    SELECT '${t.entity}'::text AS entity_type
    WHERE EXISTS (SELECT 1 FROM ${t.table} LIMIT 1)
  `).join('\nUNION ALL\n');
  const r = await q(queries);
  return r.rows.map(row => row.entity_type as string);
}

export async function getAdminUserCounts(): Promise<AdminUserCounts> {
  const r = await q(`
    SELECT
      COUNT(*)::int                                     AS total,
      COUNT(*) FILTER (WHERE is_active)::int            AS active,
      COUNT(*) FILTER (WHERE role = 'editor')::int      AS editor,
      COUNT(*) FILTER (WHERE role = 'reviewer')::int    AS reviewer,
      COUNT(*) FILTER (WHERE role = 'publisher')::int   AS publisher,
      COUNT(*) FILTER (WHERE role = 'admin')::int       AS admin
    FROM admin.users
  `);
  return r.rows[0] as AdminUserCounts;
}

// ── villages ────────────────────────────────────────────────────────────────
function buildVillageWhere(filter: VillageFilter): { where: string; params: unknown[] } {
  const where: string[] = [`l.kind::text IN ${SETTLEMENT_KINDS_SQL}`];
  const params: unknown[] = [];
  if (filter.district) {
    params.push(filter.district);
    where.push(`d.name_en = $${params.length}`);
  }
  if (filter.kind) {
    params.push(filter.kind);
    where.push(`l.kind = $${params.length}::content.locality_kind`);
  }
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`l.content_status = $${params.length}::content.content_status`);
  }
  if (filter.hasAccommodation) where.push(`l.has_accommodation`);
  if (filter.hasFood)          where.push(`l.has_food_supply`);
  if (filter.hasPhone)         where.push(`l.has_phone_signal`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const i = params.length;
    where.push(`(l.name_en ILIKE $${i} OR l.name_dz ILIKE $${i} OR l.name_romanized ILIKE $${i})`);
  }
  return { where: where.join(' AND '), params };
}

export async function getVillages(
  filter: VillageFilter = {},
  limit = 100,
  offset = 0,
): Promise<Village[]> {
  const { where, params } = buildVillageWhere(filter);
  params.push(limit, offset);
  const r = await q(`
    SELECT
      l.id,
      COALESCE(l.name_en, '')                       AS name,
      l.name_dz,
      l.name_romanized,
      l.name_meaning,
      COALESCE(d.name_en, '')                       AS district,
      COALESCE(g.name_en, '')                       AS gewog,
      COALESCE(c.name_en, '')                       AS chiwog,
      l.population_total                            AS pop_total,
      l.population_male                             AS pop_male,
      l.population_female                           AS pop_female,
      l.population_year                             AS pop_year,
      l.elevation_m,
      (l.has_accommodation)::int                    AS has_accommodation,
      l.accommodation_notes,
      (l.has_food_supply)::int                      AS has_food_supply,
      (l.has_phone_signal)::int                     AS has_phone_signal,
      l.kind::text                                  AS kind,
      l.source_feature_type                         AS class,
      l.content_status::text                        AS content_status
    FROM content.locality l
    LEFT JOIN ref.dzongkhag d ON d.id = l.dzongkhag_id
    LEFT JOIN ref.gewog     g ON g.id = l.gewog_id
    LEFT JOIN ref.chiwog    c ON c.id = l.chiwog_id
    WHERE ${where}
    ORDER BY COALESCE(d.name_en, ''), COALESCE(l.name_en, '')
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows as Village[];
}

export async function getVillageCount(filter: VillageFilter = {}): Promise<number> {
  const { where, params } = buildVillageWhere(filter);
  const r = await q(`
    SELECT COUNT(*)::int AS n
    FROM content.locality l
    LEFT JOIN ref.dzongkhag d ON d.id = l.dzongkhag_id
    WHERE ${where}
  `, params);
  return r.rows[0].n;
}

export async function getVillageStatusCounts(): Promise<VillageStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE has_accommodation)::int             AS with_accommodation,
      COUNT(*) FILTER (WHERE has_food_supply)::int               AS with_food,
      COUNT(*) FILTER (WHERE has_phone_signal)::int              AS with_phone
    FROM content.locality
    WHERE kind::text IN ${SETTLEMENT_KINDS_SQL}
  `);
  return r.rows[0] as VillageStatusCounts;
}

// ── schools ─────────────────────────────────────────────────────────────────
function buildSchoolWhere(filter: SchoolFilter): { where: string; params: unknown[] } {
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filter.district) {
    params.push(filter.district);
    where.push(`d.name_en = $${params.length}`);
  }
  if (filter.category) {
    params.push(filter.category);
    where.push(`s.category_id = (SELECT id FROM ref.school_category WHERE code = $${params.length})`);
  }
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`s.content_status = $${params.length}::content.content_status`);
  }
  if (filter.hostelOnly) where.push(`s.has_hostel`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`s.name ILIKE $${params.length}`);
  }
  return { where: where.join(' AND '), params };
}

export async function getSchools(filter: SchoolFilter = {}, limit = 100, offset = 0): Promise<School[]> {
  const { where, params } = buildSchoolWhere(filter);
  params.push(limit, offset);
  const r = await q(`
    SELECT
      s.id,
      COALESCE(s.name, '')                          AS name,
      s.category_id,
      sc.code                                       AS category,
      s.description,
      s.remarks,
      COALESCE(d.name_en, '')                       AS district,
      COALESCE(g.name_en, '')                       AS gewog,
      COALESCE(c.name_en, '')                       AS chiwog,
      s.students_total,
      s.students_male,
      s.students_female,
      s.capacity,
      s.elevation_m,
      (s.has_hostel)::int                           AS has_hostel,
      s.content_status::text                        AS content_status
    FROM content.school s
    LEFT JOIN ref.school_category sc ON sc.id = s.category_id
    LEFT JOIN ref.dzongkhag d ON d.id = s.dzongkhag_id
    LEFT JOIN ref.gewog     g ON g.id = s.gewog_id
    LEFT JOIN ref.chiwog    c ON c.id = s.chiwog_id
    WHERE ${where}
    ORDER BY COALESCE(d.name_en, ''), s.name
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows as School[];
}

export async function getSchoolCount(filter: SchoolFilter = {}): Promise<number> {
  const { where, params } = buildSchoolWhere(filter);
  const r = await q(`
    SELECT COUNT(*)::int AS n
    FROM content.school s
    LEFT JOIN ref.dzongkhag d ON d.id = s.dzongkhag_id
    WHERE ${where}
  `, params);
  return r.rows[0].n;
}

export async function getSchoolStatusCounts(): Promise<SchoolStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE has_hostel)::int                    AS with_hostel
    FROM content.school
  `);
  return r.rows[0] as SchoolStatusCounts;
}

// ── health centers ──────────────────────────────────────────────────────────
function buildHcWhere(filter: HealthCenterFilter): { where: string; params: unknown[] } {
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filter.district) {
    params.push(filter.district);
    where.push(`d.name_en = $${params.length}`);
  }
  if (filter.type) {
    params.push(filter.type);
    where.push(`hc.type_id = (SELECT id FROM ref.health_center_type WHERE code = $${params.length})`);
  }
  if (filter.status) {
    params.push(filter.status);
    where.push(`hc.status = $${params.length}::content.health_center_status`);
  }
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`hc.content_status = $${params.length}::content.content_status`);
  }
  if (filter.helipadOnly) where.push(`hc.has_helipad`);
  if (filter.fourwdOnly)  where.push(`hc.requires_4wd_access`);
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const i = params.length;
    where.push(`(hc.name_en ILIKE $${i} OR hc.name_dz ILIKE $${i} OR hc.name_old ILIKE $${i})`);
  }
  return { where: where.join(' AND '), params };
}

export async function getHealthCenters(
  filter: HealthCenterFilter = {},
  limit = 100,
  offset = 0,
): Promise<HealthCenter[]> {
  const { where, params } = buildHcWhere(filter);
  params.push(limit, offset);
  const r = await q(`
    SELECT
      hc.id,
      COALESCE(hc.name_en, '')                      AS name,
      hc.name_dz,
      hc.name_old,
      hc.description,
      hct.code                                      AS type,
      hc.status::text                               AS status,
      hc.beds,
      hc.year_established,
      COALESCE(d.name_en, '')                       AS district,
      COALESCE(g.name_en, '')                       AS gewog,
      COALESCE(c.name_en, '')                       AS chiwog,
      nl.name_en                                    AS village,
      hc.elevation_m,
      (hc.has_helipad)::int                         AS has_helipad,
      (hc.requires_4wd_access)::int                 AS requires_4wd_access,
      hc.nearest_road_access_km,
      (
        SELECT (elem->>'value')::text
        FROM jsonb_array_elements(hc.contacts) elem
        WHERE elem->>'type' = 'phone'
        LIMIT 1
      )                                             AS phone,
      EXISTS (
        SELECT 1
        FROM content.health_center_service hcs
        JOIN ref.health_service rs ON rs.id = hcs.service_id
        WHERE hcs.health_center_id = hc.id
          AND (rs.code = 'emergency' OR rs.is_emergency)
      )::int                                        AS has_emergency,
      EXISTS (
        SELECT 1
        FROM content.health_center_service hcs
        JOIN ref.health_service rs ON rs.id = hcs.service_id
        WHERE hcs.health_center_id = hc.id
          AND rs.code = 'ambulance'
      )::int                                        AS has_ambulance,
      (SELECT COUNT(*)::int FROM content.health_center_service hcs WHERE hcs.health_center_id = hc.id) AS service_count,
      hc.content_status::text                       AS content_status
    FROM content.health_center hc
    JOIN ref.health_center_type hct ON hct.id = hc.type_id
    LEFT JOIN ref.dzongkhag d ON d.id = hc.dzongkhag_id
    LEFT JOIN ref.gewog     g ON g.id = hc.gewog_id
    LEFT JOIN ref.chiwog    c ON c.id = hc.chiwog_id
    LEFT JOIN content.locality nl ON nl.id = hc.nearest_locality_id
    WHERE ${where}
    ORDER BY COALESCE(d.name_en, ''), hc.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows as HealthCenter[];
}

export async function getHealthCenterCount(filter: HealthCenterFilter = {}): Promise<number> {
  const { where, params } = buildHcWhere(filter);
  const r = await q(`
    SELECT COUNT(*)::int AS n
    FROM content.health_center hc
    LEFT JOIN ref.dzongkhag d ON d.id = hc.dzongkhag_id
    WHERE ${where}
  `, params);
  return r.rows[0].n;
}

export async function getHealthCenterStatusCounts(): Promise<HealthCenterStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE status = 'operational')::int        AS operational,
      COUNT(*) FILTER (WHERE has_helipad)::int                   AS with_helipad,
      COUNT(*) FILTER (WHERE requires_4wd_access)::int           AS requires_4wd
    FROM content.health_center
  `);
  return r.rows[0] as HealthCenterStatusCounts;
}

export async function getHealthCenterServices(healthCenterId: number): Promise<HealthCenterService[]> {
  const r = await q(`
    SELECT
      hcs.id,
      hcs.service_id,
      rs.code,
      COALESCE(rs.label_en, rs.code) AS label,
      (rs.is_emergency)::int         AS is_emergency,
      (hcs.available_24h)::int       AS available_24h,
      hcs.notes
    FROM content.health_center_service hcs
    JOIN ref.health_service rs ON rs.id = hcs.service_id
    WHERE hcs.health_center_id = $1
    ORDER BY rs.is_emergency DESC, rs.sort_order, rs.label_en
  `, [healthCenterId]);
  return r.rows as HealthCenterService[];
}

// ── waypoints ───────────────────────────────────────────────────────────────
export interface WaypointFilter {
  category?: string;
  district?: string;
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  search?: string;
}

export async function getWaypoints(
  limit = 100,
  offset = 0,
  filter: WaypointFilter = {},
): Promise<Waypoint[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.category) {
    params.push(filter.category);
    where.push(`wt.category::text = $${params.length}`);
  }
  if (filter.district) {
    params.push(filter.district);
    where.push(`d.name_en = $${params.length}`);
  }
  const status = filter.contentStatus ?? 'all';
  if (status !== 'all') {
    params.push(status);
    where.push(`w.content_status = $${params.length}::content.content_status`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(w.name_en ILIKE $${params.length} OR w.name_dz ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const r = await q(`
    SELECT
      w.id,
      COALESCE(w.name_en, '')                       AS name,
      w.name_dz,
      wt.code                                       AS wp_type,
      wt.label_en                                   AS wp_type_label,
      wt.category::text                             AS wp_category,
      COALESCE(d.name_en, '')                       AS district,
      COALESCE(g.name_en, '')                       AS gewog,
      COALESCE(c.name_en, '')                       AS chiwog,
      w.elevation_m,
      (wt.show_in_app)::int                         AS show_in_app,
      (w.is_visible)::int                           AS is_visible,
      CASE WHEN jsonb_typeof(w.facilities) = 'array'
           THEN array_to_string(
                  ARRAY(SELECT jsonb_array_elements_text(w.facilities)),
                  ', ')
           ELSE NULL END                            AS facilities,
      w.content_status::text                        AS content_status,
      (
        SELECT rw.route_id
        FROM content.route_waypoint rw
        WHERE rw.waypoint_id = w.id
        ORDER BY rw.sequence_order
        LIMIT 1
      )                                             AS trek_route_id,
      NULL::int                                     AS sequence_order,
      NULL::real                                    AS distance_from_start_km,
      (SELECT COUNT(*)::int FROM content.route_waypoint rw WHERE rw.waypoint_id = w.id) AS route_count
    FROM content.waypoint w
    JOIN ref.waypoint_type wt ON wt.id = w.waypoint_type_id
    LEFT JOIN ref.dzongkhag d ON d.id = w.dzongkhag_id
    LEFT JOIN ref.gewog g     ON g.id = w.gewog_id
    LEFT JOIN ref.chiwog c    ON c.id = w.chiwog_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY COALESCE(d.name_en, ''), w.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows as Waypoint[];
}

export interface WaypointCounts {
  total: number;
  byCategory: Array<{ category: string; count: number }>;
  byContentStatus: Array<{ status: string; count: number }>;
}

export async function getWaypointCounts(filter: Pick<WaypointFilter, 'category' | 'district' | 'contentStatus' | 'search'> = {}): Promise<number> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.category) {
    params.push(filter.category);
    where.push(`wt.category::text = $${params.length}`);
  }
  if (filter.district) {
    params.push(filter.district);
    where.push(`d.name_en = $${params.length}`);
  }
  const status = filter.contentStatus ?? 'all';
  if (status !== 'all') {
    params.push(status);
    where.push(`w.content_status = $${params.length}::content.content_status`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(w.name_en ILIKE $${params.length} OR w.name_dz ILIKE $${params.length})`);
  }
  const r = await q(`
    SELECT COUNT(*)::int AS n
    FROM content.waypoint w
    JOIN ref.waypoint_type wt ON wt.id = w.waypoint_type_id
    LEFT JOIN ref.dzongkhag d ON d.id = w.dzongkhag_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `, params);
  return r.rows[0].n;
}

export async function getWaypointCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
  const r = await q(`
    SELECT wt.category::text AS category, COUNT(*)::int AS count
    FROM content.waypoint w
    JOIN ref.waypoint_type wt ON wt.id = w.waypoint_type_id
    GROUP BY wt.category
    ORDER BY count DESC
  `);
  return r.rows as Array<{ category: string; count: number }>;
}

// ── dzongs ──────────────────────────────────────────────────────────────────
const DZONG_SELECT = `
  SELECT
    dz.id,
    dz.name_en                                    AS name,
    dz.name_dz,
    dz.name_romanized,
    dz.slug,
    dz.dzong_type::text                           AS type,
    COALESCE(d.name_en, '')                       AS district,
    COALESCE(g.name_en, '')                       AS gewog,
    COALESCE(c.name_en, '')                       AS chiwog,
    dz.elevation_m,
    dz.built_year,
    dz.built_year_approx,
    figure.name_en                                AS built_by,
    dz.founder_figure_id,
    p.label_en                                    AS period,
    dz.period_id,
    dz.heritage_site_id,
    dz.significance,
    dz.description,
    dz.visitor_info,
    dz.conservation_status::text                  AS conservation_status,
    dz.access_status::text                        AS access_status,
    (dz.is_current_admin_seat)::int               AS is_current_admin_seat,
    (dz.houses_monk_body)::int                    AS houses_monk_body,
    dz.monk_body_capacity,
    CASE WHEN jsonb_typeof(dz.fees) = 'array' THEN dz.fees ELSE NULL END AS fees,
    CASE WHEN jsonb_typeof(dz.opening_hours) = 'object' THEN dz.opening_hours ELSE NULL END AS opening_hours,
    (dz.fees->0->>'amount')                       AS entry_fee,
    dz.opening_hours::text                        AS open_hours,
    dz.content_status::text                       AS content_status,
    dz.updated_at                                 AS updated_at
  FROM content.dzong dz
  LEFT JOIN ref.dzongkhag d ON d.id = dz.dzongkhag_id
  LEFT JOIN ref.gewog     g ON g.id = dz.gewog_id
  LEFT JOIN ref.chiwog    c ON c.id = dz.chiwog_id
  LEFT JOIN ref.historical_period p ON p.id = dz.period_id
  LEFT JOIN content.historical_figure figure ON figure.id = dz.founder_figure_id
`;

export async function getDzongs(): Promise<Dzong[]> {
  const r = await q(`${DZONG_SELECT} ORDER BY COALESCE(d.name_en, ''), dz.name_en`);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as Dzong[];
}

export async function getDzongById(id: number): Promise<Dzong | null> {
  const r = await q(`${DZONG_SELECT} WHERE dz.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as Dzong;
}

export interface DzongStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  admin_seat: number;
  with_monk_body: number;
}

export async function getDzongStatusCounts(): Promise<DzongStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE is_current_admin_seat)::int         AS admin_seat,
      COUNT(*) FILTER (WHERE houses_monk_body)::int              AS with_monk_body
    FROM content.dzong
  `);
  return r.rows[0] as DzongStatusCounts;
}

export async function getDzongLhakhangs(dzongId: number): Promise<DzongLhakhang[]> {
  const r = await q(`
    SELECT
      id,
      name_en                AS name,
      name_dz,
      description,
      significance,
      sort_order,
      content_status::text   AS content_status
    FROM content.dzong_lhakhang
    WHERE dzong_id = $1
    ORDER BY sort_order, name_en
  `, [dzongId]);
  return r.rows as DzongLhakhang[];
}

// ── festivals ───────────────────────────────────────────────────────────────
export type FestivalAudience =
  | 'open_to_all' | 'tourists_welcome' | 'locals_preferred'
  | 'monastic_only' | 'closed';

export interface FestivalFee {
  audience?: string;
  amount?: number;
  currency?: string;
}

export interface FestivalAgendaItem {
  day?: number;
  items?: string[];
  notes?: string;
}

export interface Festival {
  id: number;
  name: string;
  name_dz: string | null;
  name_romanized: string | null;
  name_local: string | null;
  slug: string | null;
  description: string | null;
  significance: string | null;
  history: string | null;
  folklore: string | null;
  festival_type_id: number | null;
  festival_type_code: string | null;
  festival_type_label: string | null;
  is_religious: number;
  lunar_month: number | null;
  lunar_day_start: number | null;
  lunar_day_end: number | null;
  duration_days: number | null;
  dress_code: string | null;
  audience: FestivalAudience;
  fees: FestivalFee[] | null;
  agenda: FestivalAgendaItem[] | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  /** Convenience: number of thangkas linked via festival_thangka_display. */
  thangka_display_count: number;
  /** Convenience: name of the primary venue (dzong / heritage / locality). */
  primary_venue_name: string | null;
  primary_venue_kind: 'dzong' | 'heritage_site' | 'locality' | null;
  primary_venue_district: string | null;
}

export interface FestivalOccurrence {
  id: number;
  festival_id: number;
  year: number;
  start_date: string;   // ISO date
  end_date: string;
  is_confirmed: number;
  calendar_source: string | null;
  notes: string | null;
}

export interface FestivalVenue {
  id: number;
  festival_id: number;
  /** Exactly one of dzong/heritage_site/locality is set. */
  dzong_id: number | null;
  heritage_site_id: number | null;
  locality_id: number | null;
  /** Synthesized: which target this row points at. */
  kind: 'dzong' | 'heritage_site' | 'locality';
  /** Synthesized: name of the named target. */
  name: string;
  district: string | null;
  role: string | null;
  is_primary: number;
  notes: string | null;
}

export interface FestivalHighlight {
  id: number;
  sequence: number;
  title_en: string;
  title_dz: string | null;
  description: string | null;
  day_of_festival: number | null;
}

export interface FestivalVisitorTip {
  id: number;
  sequence: number;
  tip_en: string;
  tip_dz: string | null;
  category: string | null;
}

export interface FestivalFigureRow {
  id: number;
  figure_id: number;
  figure_name: string;
  figure_period: string | null;
  role: string | null;
  notes: string | null;
}

export interface FestivalThangkaDisplay {
  id: number;
  thangka_id: number;
  thangka_name: string;
  thangka_style: string;
  is_thongdrol: number;
  day_of_festival: number | null;
  time_of_day: string | null;       // ISO HH:MM:SS
  display_duration_min: number | null;
  notes: string | null;
}

const FESTIVAL_SELECT = `
  SELECT
    f.id,
    f.name_en                                            AS name,
    f.name_dz,
    f.name_romanized,
    f.name_local,
    f.slug,
    f.description,
    f.significance,
    f.history,
    f.folklore,
    f.festival_type_id,
    ft.code                                              AS festival_type_code,
    COALESCE(ft.label_en, ft.code)                       AS festival_type_label,
    (COALESCE(ft.is_religious, TRUE))::int               AS is_religious,
    f.lunar_month,
    f.lunar_day_start,
    f.lunar_day_end,
    f.duration_days,
    f.dress_code,
    f.audience::text                                     AS audience,
    CASE WHEN jsonb_typeof(f.fees) = 'array'   THEN f.fees   ELSE NULL END AS fees,
    CASE WHEN jsonb_typeof(f.agenda) = 'array' THEN f.agenda ELSE NULL END AS agenda,
    f.content_status::text                               AS content_status,
    f.updated_at,
    (SELECT COUNT(*)::int FROM content.festival_thangka_display ftd WHERE ftd.festival_id = f.id) AS thangka_display_count,
    pv.name                                              AS primary_venue_name,
    pv.kind                                              AS primary_venue_kind,
    pv.district                                          AS primary_venue_district
  FROM content.festival f
  LEFT JOIN ref.festival_type ft ON ft.id = f.festival_type_id
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN fv.dzong_id IS NOT NULL THEN 'dzong'
        WHEN fv.heritage_site_id IS NOT NULL THEN 'heritage_site'
        ELSE 'locality'
      END AS kind,
      COALESCE(dz.name_en, hs.name_en, lc.name_en) AS name,
      COALESCE(dz_d.name_en, hs_d.name_en, lc_d.name_en) AS district
    FROM content.festival_venue fv
    LEFT JOIN content.dzong         dz   ON dz.id = fv.dzong_id
    LEFT JOIN ref.dzongkhag         dz_d ON dz_d.id = dz.dzongkhag_id
    LEFT JOIN content.heritage_site hs   ON hs.id = fv.heritage_site_id
    LEFT JOIN ref.dzongkhag         hs_d ON hs_d.id = hs.dzongkhag_id
    LEFT JOIN content.locality      lc   ON lc.id = fv.locality_id
    LEFT JOIN ref.dzongkhag         lc_d ON lc_d.id = lc.dzongkhag_id
    WHERE fv.festival_id = f.id AND fv.is_primary
    LIMIT 1
  ) pv ON TRUE
`;

export interface FestivalFilter {
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  typeCode?: string;
  audience?: FestivalAudience | 'all';
  lunarMonth?: number;
  hasThangka?: boolean;
  search?: string;
}

export async function getFestivals(limit = 200, offset = 0, filter: FestivalFilter = {}): Promise<Festival[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const status = filter.contentStatus ?? 'all';
  if (status !== 'all') {
    params.push(status);
    where.push(`f.content_status = $${params.length}::content.content_status`);
  }
  if (filter.typeCode) {
    params.push(filter.typeCode);
    where.push(`ft.code = $${params.length}`);
  }
  const aud = filter.audience ?? 'all';
  if (aud !== 'all') {
    params.push(aud);
    where.push(`f.audience = $${params.length}::content.festival_audience`);
  }
  if (filter.lunarMonth) {
    params.push(filter.lunarMonth);
    where.push(`f.lunar_month = $${params.length}`);
  }
  if (filter.hasThangka) {
    where.push(`EXISTS (SELECT 1 FROM content.festival_thangka_display ftd WHERE ftd.festival_id = f.id)`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(f.name_en ILIKE $${params.length} OR f.name_dz ILIKE $${params.length} OR f.name_local ILIKE $${params.length})`);
  }
  params.push(limit, offset);
  const r = await q(`${FESTIVAL_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY f.lunar_month NULLS LAST, f.lunar_day_start NULLS LAST, f.name_en
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return r.rows.map(row => ({ ...row, updated_at: iso(row.updated_at) })) as Festival[];
}

export async function getFestivalById(id: number): Promise<Festival | null> {
  const r = await q(`${FESTIVAL_SELECT} WHERE f.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as Festival;
}

export interface FestivalStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  with_thangka: number;
  tourists_welcome: number;
}

export async function getFestivalStatusCounts(): Promise<FestivalStatusCounts> {
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM content.festival_thangka_display ftd WHERE ftd.festival_id = content.festival.id
      ))::int                                                    AS with_thangka,
      COUNT(*) FILTER (WHERE audience IN ('open_to_all','tourists_welcome'))::int AS tourists_welcome
    FROM content.festival
  `);
  return r.rows[0] as FestivalStatusCounts;
}

export interface FestivalTypeOption extends RefOption {
  is_religious: boolean;
}

export async function getFestivalTypeOptions(): Promise<FestivalTypeOption[]> {
  const r = await q(`
    SELECT id, code, COALESCE(label_en, code) AS label, is_religious
    FROM ref.festival_type
    ORDER BY sort_order, label_en
  `);
  return r.rows as FestivalTypeOption[];
}

export async function getFestivalOccurrences(festivalId: number, limit = 10): Promise<FestivalOccurrence[]> {
  const r = await q(`
    SELECT
      id, festival_id, year,
      to_char(start_date, 'YYYY-MM-DD') AS start_date,
      to_char(end_date,   'YYYY-MM-DD') AS end_date,
      (is_confirmed)::int AS is_confirmed,
      calendar_source, notes
    FROM content.festival_occurrence
    WHERE festival_id = $1
    ORDER BY year DESC, start_date DESC
    LIMIT $2
  `, [festivalId, limit]);
  return r.rows as FestivalOccurrence[];
}

export async function getFestivalVenues(festivalId: number): Promise<FestivalVenue[]> {
  const r = await q(`
    SELECT
      fv.id,
      fv.festival_id,
      fv.dzong_id,
      fv.heritage_site_id,
      fv.locality_id,
      CASE
        WHEN fv.dzong_id IS NOT NULL THEN 'dzong'
        WHEN fv.heritage_site_id IS NOT NULL THEN 'heritage_site'
        ELSE 'locality'
      END                                                       AS kind,
      COALESCE(dz.name_en, hs.name_en, lc.name_en, '(unknown)') AS name,
      COALESCE(dz_d.name_en, hs_d.name_en, lc_d.name_en)        AS district,
      fv.role,
      (fv.is_primary)::int AS is_primary,
      fv.notes
    FROM content.festival_venue fv
    LEFT JOIN content.dzong         dz   ON dz.id = fv.dzong_id
    LEFT JOIN ref.dzongkhag         dz_d ON dz_d.id = dz.dzongkhag_id
    LEFT JOIN content.heritage_site hs   ON hs.id = fv.heritage_site_id
    LEFT JOIN ref.dzongkhag         hs_d ON hs_d.id = hs.dzongkhag_id
    LEFT JOIN content.locality      lc   ON lc.id = fv.locality_id
    LEFT JOIN ref.dzongkhag         lc_d ON lc_d.id = lc.dzongkhag_id
    WHERE fv.festival_id = $1
    ORDER BY fv.is_primary DESC, fv.id
  `, [festivalId]);
  return r.rows as FestivalVenue[];
}

export async function getFestivalHighlights(festivalId: number): Promise<FestivalHighlight[]> {
  const r = await q(`
    SELECT id, sequence, title_en, title_dz, description, day_of_festival
    FROM content.festival_highlight
    WHERE festival_id = $1
    ORDER BY sequence
  `, [festivalId]);
  return r.rows as FestivalHighlight[];
}

export async function getFestivalVisitorTips(festivalId: number): Promise<FestivalVisitorTip[]> {
  const r = await q(`
    SELECT id, sequence, tip_en, tip_dz, category
    FROM content.festival_visitor_tip
    WHERE festival_id = $1
    ORDER BY sequence
  `, [festivalId]);
  return r.rows as FestivalVisitorTip[];
}

export async function getFestivalFigures(festivalId: number): Promise<FestivalFigureRow[]> {
  const r = await q(`
    SELECT
      ff.id,
      ff.figure_id,
      hf.name_en        AS figure_name,
      hp.label_en       AS figure_period,
      ff.role,
      ff.notes
    FROM content.festival_figure ff
    JOIN content.historical_figure hf ON hf.id = ff.figure_id
    LEFT JOIN ref.historical_period hp ON hp.id = hf.period_id
    WHERE ff.festival_id = $1
    ORDER BY ff.role NULLS LAST, hf.name_en
  `, [festivalId]);
  return r.rows as FestivalFigureRow[];
}

export async function getFestivalThangkaDisplays(festivalId: number): Promise<FestivalThangkaDisplay[]> {
  const r = await q(`
    SELECT
      ftd.id,
      ftd.thangka_id,
      t.name_en                                       AS thangka_name,
      t.style::text                                   AS thangka_style,
      (t.is_thongdrol)::int                           AS is_thongdrol,
      ftd.day_of_festival,
      to_char(ftd.time_of_day, 'HH24:MI')             AS time_of_day,
      ftd.display_duration_min,
      ftd.notes
    FROM content.festival_thangka_display ftd
    JOIN content.thangka t ON t.id = ftd.thangka_id
    WHERE ftd.festival_id = $1
    ORDER BY ftd.day_of_festival NULLS LAST, ftd.time_of_day NULLS LAST
  `, [festivalId]);
  return r.rows as FestivalThangkaDisplay[];
}

// ── biological corridors ────────────────────────────────────────────────────
export async function getBiologicalCorridors(): Promise<BiologicalCorridor[]> {
  const r = await q(`
    SELECT
      ca.id,
      COALESCE(ca.code, '')                         AS code,
      ca.name_en                                    AS name,
      COALESCE(
        (
          SELECT string_agg(other.name_en, ', ' ORDER BY other.name_en)
          FROM content.corridor_link cl
          JOIN content.conservation_area other ON other.id = cl.connects_pa_id
          WHERE cl.corridor_id = ca.id
        ),
        ''
      )                                             AS connects,
      COALESCE(ca.key_species_notes, '')            AS key_species,
      ca.description
    FROM content.conservation_area ca
    WHERE ca.pa_type = 'biological_corridor'
    ORDER BY ca.code, ca.name_en
  `);
  return r.rows as BiologicalCorridor[];
}

// ── conservation areas + corridors (unified) ────────────────────────────────
const PA_TYPE_LABEL: Record<PaType, string> = {
  national_park:         'National park',
  wildlife_sanctuary:    'Wildlife sanctuary',
  strict_nature_reserve: 'Strict nature reserve',
  biological_corridor:   'Biological corridor',
  ramsar_site:           'Ramsar site',
  royal_botanical_park:  'Royal botanical park',
  nature_reserve:        'Nature reserve',
  other:                 'Other',
};

const CONSERVATION_AREA_SELECT = `
  SELECT
    ca.id,
    ca.slug,
    ca.code,
    ca.pa_name,
    ca.name_en,
    ca.name_dz,
    ca.description,
    ca.key_species_notes,
    ca.pa_type::text             AS pa_type,
    ca.iucn_category::text       AS iucn_category,
    ca.managing_authority,
    ca.established_year,
    (ca.is_active)::int          AS is_active,
    ca.area_km2,
    ca.area_ha,
    ca.area_m2,
    (ca.permit_required)::int    AS permit_required,
    ca.permit_info,
    ca.access_status::text       AS access_status,
    ca.visitor_regulations,
    ca.content_status::text      AS content_status,
    ca.updated_at,
    (SELECT COUNT(*)::int FROM content.corridor_link    cl WHERE cl.corridor_id    = ca.id) AS outgoing_link_count,
    (SELECT COUNT(*)::int FROM content.corridor_link    cl WHERE cl.connects_pa_id = ca.id) AS incoming_link_count,
    (SELECT COUNT(*)::int FROM content.management_zone  mz WHERE mz.conservation_area_id = ca.id) AS zone_count
  FROM content.conservation_area ca
`;

function attachPaLabel(row: Record<string, unknown>): ConservationAreaRow {
  return {
    ...row,
    updated_at: iso(row.updated_at),
    pa_type_label: PA_TYPE_LABEL[(row.pa_type as PaType)] ?? String(row.pa_type),
  } as ConservationAreaRow;
}

export interface ConservationAreaFilter {
  paType?: PaType;
  excludePaType?: PaType;
  iucnCategory?: IucnCategory;
  accessStatus?: 'open' | 'restricted' | 'closed' | 'unknown';
  activeOnly?: boolean;
  contentStatus?: 'draft' | 'in_review' | 'published' | 'archived' | 'all';
  search?: string;
}

function buildConservationWhere(filter: ConservationAreaFilter) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.paType) {
    params.push(filter.paType);
    where.push(`ca.pa_type = $${params.length}::content.pa_type`);
  }
  if (filter.excludePaType) {
    params.push(filter.excludePaType);
    where.push(`ca.pa_type <> $${params.length}::content.pa_type`);
  }
  if (filter.iucnCategory) {
    params.push(filter.iucnCategory);
    where.push(`ca.iucn_category = $${params.length}::content.iucn_category`);
  }
  if (filter.accessStatus) {
    params.push(filter.accessStatus);
    where.push(`ca.access_status = $${params.length}::content.access_status`);
  }
  if (filter.activeOnly) where.push(`ca.is_active`);
  const cs = filter.contentStatus ?? 'all';
  if (cs !== 'all') {
    params.push(cs);
    where.push(`ca.content_status = $${params.length}::content.content_status`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    where.push(`(ca.name_en ILIKE $${params.length} OR ca.name_dz ILIKE $${params.length} OR ca.code ILIKE $${params.length})`);
  }
  return { where, params };
}

export async function getConservationAreaList(filter: ConservationAreaFilter = {}): Promise<ConservationAreaRow[]> {
  const { where, params } = buildConservationWhere(filter);
  const r = await q(`${CONSERVATION_AREA_SELECT}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ca.area_km2 DESC NULLS LAST, ca.name_en`, params);
  return r.rows.map(attachPaLabel);
}

export async function getConservationAreaById(id: number): Promise<ConservationAreaRow | null> {
  const r = await q(`${CONSERVATION_AREA_SELECT} WHERE ca.id = $1`, [id]);
  if (!r.rows[0]) return null;
  return attachPaLabel(r.rows[0]);
}

export interface ConservationStatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
  total: number;
  pa_total: number;
  corridor_total: number;
  active: number;
  permit_required: number;
}

export async function getConservationStatusCounts(filter: Pick<ConservationAreaFilter, 'excludePaType' | 'paType'> = {}): Promise<ConservationStatusCounts> {
  const { where, params } = buildConservationWhere(filter);
  const r = await q(`
    SELECT
      COUNT(*) FILTER (WHERE ca.content_status = 'draft')::int      AS draft,
      COUNT(*) FILTER (WHERE ca.content_status = 'in_review')::int  AS in_review,
      COUNT(*) FILTER (WHERE ca.content_status = 'published')::int  AS published,
      COUNT(*) FILTER (WHERE ca.content_status = 'archived')::int   AS archived,
      COUNT(*)::int                                                 AS total,
      COUNT(*) FILTER (WHERE ca.pa_type <> 'biological_corridor')::int AS pa_total,
      COUNT(*) FILTER (WHERE ca.pa_type =  'biological_corridor')::int AS corridor_total,
      COUNT(*) FILTER (WHERE ca.is_active)::int                     AS active,
      COUNT(*) FILTER (WHERE ca.permit_required)::int               AS permit_required
    FROM content.conservation_area ca
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `, params);
  return r.rows[0] as ConservationStatusCounts;
}

/**
 * Lookup of corridor → connected PAs (outgoing edges).
 * `paId` is the row.id, NOT a `pa_id` column.
 */
export async function getCorridorLinksFor(paId: number): Promise<CorridorLinkRow[]> {
  const r = await q(`
    SELECT
      cl.id,
      other.id            AS pa_id,
      other.code          AS pa_code,
      other.name_en       AS pa_name,
      other.pa_type::text AS pa_type,
      cl.role,
      cl.notes
    FROM content.corridor_link cl
    JOIN content.conservation_area other ON other.id = cl.connects_pa_id
    WHERE cl.corridor_id = $1
    ORDER BY other.name_en
  `, [paId]);
  return r.rows as CorridorLinkRow[];
}

/** Reverse: for a PA, which corridors link IN to it. */
export async function getIncomingCorridorLinks(paId: number): Promise<CorridorLinkRow[]> {
  const r = await q(`
    SELECT
      cl.id,
      cor.id            AS pa_id,
      cor.code          AS pa_code,
      cor.name_en       AS pa_name,
      cor.pa_type::text AS pa_type,
      cl.role,
      cl.notes
    FROM content.corridor_link cl
    JOIN content.conservation_area cor ON cor.id = cl.corridor_id
    WHERE cl.connects_pa_id = $1
    ORDER BY cor.name_en
  `, [paId]);
  return r.rows as CorridorLinkRow[];
}

export async function getManagementZones(paId: number): Promise<ManagementZone[]> {
  const r = await q(`
    SELECT
      id,
      kind::text     AS kind,
      name,
      description,
      regulations,
      area_m2
    FROM content.management_zone
    WHERE conservation_area_id = $1
    ORDER BY
      CASE kind
        WHEN 'core' THEN 0
        WHEN 'buffer' THEN 1
        WHEN 'multi_use' THEN 2
        WHEN 'restoration' THEN 3
        WHEN 'community_use' THEN 4
        ELSE 5
      END,
      name
  `, [paId]);
  return r.rows as ManagementZone[];
}

// ── dashboard counts ────────────────────────────────────────────────────────
export interface DashboardCounts {
  trekRoutes: number;
  birdSpecies: number;
  wildlifeSpecies: number;
  heritageSites: number;
  dzongs: number;
  conservationAreas: number;
  villages: number;
  schools: number;
  healthCenters: number;
  waypoints: number;
  chiwogs: number;
  gewogs: number;
  locationLinks: number;
  routesWithDifficulty: number;
  routesWithDuration: number;
  routesWithSeason: number;
  routesWithDist: number;
  routesWithHighlights: number;
  routesWithDesc: number;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const r = await q(`
    SELECT
      (SELECT COUNT(*) FROM content.trek_route       WHERE content_status='published')::int AS "trekRoutes",
      (SELECT COUNT(*) FROM content.species          WHERE class='Aves' AND is_curated)::int AS "birdSpecies",
      (SELECT COUNT(*) FROM content.species          WHERE kingdom='animalia' AND is_curated
                                                       AND (class IS NULL OR class<>'Aves'))::int AS "wildlifeSpecies",
      (SELECT COUNT(*) FROM content.heritage_site)::int AS "heritageSites",
      (SELECT COUNT(*) FROM content.dzong)::int AS "dzongs",
      (SELECT COUNT(*) FROM content.conservation_area WHERE pa_type<>'biological_corridor')::int AS "conservationAreas",
      (SELECT COUNT(*) FROM content.locality         WHERE kind::text IN ${SETTLEMENT_KINDS_SQL})::int AS "villages",
      (SELECT COUNT(*) FROM content.school)::int AS "schools",
      (SELECT COUNT(*) FROM content.health_center)::int AS "healthCenters",
      (SELECT COUNT(*) FROM content.waypoint)::int AS "waypoints",
      (SELECT COUNT(*) FROM ref.chiwog)::int AS "chiwogs",
      (SELECT COUNT(*) FROM ref.gewog)::int AS "gewogs",
      (SELECT COUNT(*) FROM content.species_location sl
        JOIN content.species s ON s.id = sl.species_id
        WHERE s.class='Aves')::int AS "locationLinks",
      (SELECT COUNT(*) FROM content.trek_route WHERE difficulty IS NOT NULL AND content_status='published')::int AS "routesWithDifficulty",
      (SELECT COUNT(*) FROM content.trek_route WHERE duration_days IS NOT NULL AND content_status='published')::int AS "routesWithDuration",
      (SELECT COUNT(*) FROM content.trek_route WHERE season_notes IS NOT NULL AND content_status='published')::int AS "routesWithSeason",
      (SELECT COUNT(*) FROM content.trek_route WHERE distance_km IS NOT NULL AND content_status='published')::int AS "routesWithDist",
      (SELECT COUNT(*) FROM content.trek_route WHERE highlights IS NOT NULL AND content_status='published')::int AS "routesWithHighlights",
      (SELECT COUNT(*) FROM content.trek_route WHERE description IS NOT NULL AND content_status='published')::int AS "routesWithDesc"
  `);
  return r.rows[0] as DashboardCounts;
}

// ── recent changes (replaces inline page.tsx query) ─────────────────────────
export interface RecentChange {
  entity_type: string;
  entity_name: string;
  last_updated: string | null;
}

export async function getRecentChanges(limit = 10): Promise<RecentChange[]> {
  const r = await q(`
    (
      SELECT 'Route'::text AS entity_type, name_en AS entity_name, updated_at
      FROM content.trek_route
      WHERE updated_at IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT $1
    )
    UNION ALL
    (
      SELECT 'Bird'::text AS entity_type, common_name_en AS entity_name, updated_at
      FROM content.species
      WHERE class = 'Aves' AND is_curated AND updated_at IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT $1
    )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT $1
  `, [limit]);
  return r.rows.map(row => ({
    entity_type: row.entity_type,
    entity_name: row.entity_name,
    last_updated: iso(row.updated_at),
  }));
}

// ── POI (unified materialized view) ─────────────────────────────────────────
export interface POI {
  category: string;       // 'locality' | 'waypoint' | 'heritage_site' | 'dzong' | 'health_center' | 'school'
  ref_id: number;
  name: string;
  name_dz: string | null;
  subtype: string | null;
  district: string | null;
  elevation_m: number | null;
  lon: number | null;
  lat: number | null;
}

export interface POICategoryCount {
  category: string;
  count: number;
}

export async function getPOIs(opts: {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
} = {}): Promise<POI[]> {
  const { limit = 1500, offset = 0, category, search } = opts;
  const where: string[] = [];
  const params: unknown[] = [];
  if (category && category !== 'all') {
    params.push(category);
    where.push(`p.category = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`p.name ILIKE $${params.length}`);
  }
  params.push(limit, offset);
  const r = await q(`
    SELECT
      p.category,
      p.ref_id,
      p.name,
      p.name_dz,
      p.subtype,
      d.name_en      AS district,
      p.elevation_m,
      ST_X(p.geom)   AS lon,
      ST_Y(p.geom)   AS lat
    FROM geo.poi p
    LEFT JOIN ref.dzongkhag d ON d.id = p.dzongkhag_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY p.name
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return r.rows as POI[];
}

export async function getPOICategoryCounts(): Promise<POICategoryCount[]> {
  const r = await q(`
    SELECT category, COUNT(*)::int AS count
    FROM geo.poi
    GROUP BY category
    ORDER BY count DESC
  `);
  return r.rows as POICategoryCount[];
}

// ── single-row getters for detail editors ───────────────────────────────────
// Used by /waypoints/[id], /villages/[id], /schools/[id],
// /health-centers/[id] and the corresponding edit clients.

export interface WaypointFull {
  id: number;
  name_en: string | null;
  name_dz: string | null;
  description: string | null;
  remarks: string | null;
  waypoint_type_id: number | null;
  waypoint_type_label: string | null;
  waypoint_type_category: string | null;
  lon: number | null;
  lat: number | null;
  elevation_m: number | null;
  dzongkhag_id: number | null;
  dzongkhag_label: string | null;
  gewog_id: number | null;
  chiwog_id: number | null;
  is_visible: number;
  source_dataset: string | null;
  source_record_id: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
  route_count: number;
}

export async function getWaypointById(id: number): Promise<WaypointFull | null> {
  const r = await q(`
    SELECT
      w.id,
      w.name_en,
      w.name_dz,
      w.description,
      w.remarks,
      w.waypoint_type_id,
      wt.label_en               AS waypoint_type_label,
      wt.category::text         AS waypoint_type_category,
      ST_X(w.geom::geometry)    AS lon,
      ST_Y(w.geom::geometry)    AS lat,
      w.elevation_m,
      w.dzongkhag_id,
      d.name_en                 AS dzongkhag_label,
      w.gewog_id,
      w.chiwog_id,
      (w.is_visible)::int       AS is_visible,
      w.source_dataset,
      w.source_record_id,
      w.content_status::text    AS content_status,
      w.updated_at,
      (SELECT COUNT(*)::int FROM content.route_waypoint rw WHERE rw.waypoint_id = w.id) AS route_count
    FROM content.waypoint w
    LEFT JOIN ref.waypoint_type wt ON wt.id = w.waypoint_type_id
    LEFT JOIN ref.dzongkhag d ON d.id = w.dzongkhag_id
    WHERE w.id = $1
  `, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as WaypointFull;
}

export interface LocalityFull {
  id: number;
  name_en: string;
  name_dz: string | null;
  name_romanized: string | null;
  name_meaning: string | null;
  kind: LocalityKind;
  source_feature_type: string | null;
  description: string | null;
  lon: number | null;
  lat: number | null;
  elevation_m: number | null;
  dzongkhag_id: number | null;
  dzongkhag_label: string | null;
  gewog_id: number | null;
  chiwog_id: number | null;
  population_male: number | null;
  population_female: number | null;
  population_total: number | null;
  population_year: number | null;
  has_accommodation: boolean | null;
  accommodation_notes: string | null;
  has_food_supply: boolean | null;
  has_phone_signal: boolean | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export async function getLocalityById(id: number): Promise<LocalityFull | null> {
  const r = await q(`
    SELECT
      l.id,
      l.name_en,
      l.name_dz,
      l.name_romanized,
      l.name_meaning,
      l.kind::text                AS kind,
      l.source_feature_type,
      l.description,
      ST_X(l.geom::geometry)      AS lon,
      ST_Y(l.geom::geometry)      AS lat,
      l.elevation_m,
      l.dzongkhag_id,
      d.name_en                   AS dzongkhag_label,
      l.gewog_id,
      l.chiwog_id,
      l.population_male,
      l.population_female,
      l.population_total,
      l.population_year,
      l.has_accommodation,
      l.accommodation_notes,
      l.has_food_supply,
      l.has_phone_signal,
      l.content_status::text      AS content_status,
      l.updated_at
    FROM content.locality l
    LEFT JOIN ref.dzongkhag d ON d.id = l.dzongkhag_id
    WHERE l.id = $1
  `, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as LocalityFull;
}

export interface SchoolFull {
  id: number;
  name: string;
  category_id: number | null;
  category: string | null;          // ref.school_category code
  description: string | null;
  remarks: string | null;
  lon: number | null;
  lat: number | null;
  elevation_m: number | null;
  dzongkhag_id: number | null;
  dzongkhag_label: string | null;
  gewog_id: number | null;
  chiwog_id: number | null;
  students_female: number | null;
  students_male: number | null;
  students_total: number | null;
  capacity: number | null;
  has_hostel: number;
  source_dataset: string | null;
  source_record_id: string | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export async function getSchoolById(id: number): Promise<SchoolFull | null> {
  const r = await q(`
    SELECT
      s.id,
      s.name,
      s.category_id,
      sc.code                  AS category,
      s.description,
      s.remarks,
      ST_X(s.geom::geometry)   AS lon,
      ST_Y(s.geom::geometry)   AS lat,
      s.elevation_m,
      s.dzongkhag_id,
      d.name_en                AS dzongkhag_label,
      s.gewog_id,
      s.chiwog_id,
      s.students_female,
      s.students_male,
      s.students_total,
      s.capacity,
      (s.has_hostel)::int      AS has_hostel,
      s.source_dataset,
      s.source_record_id,
      s.content_status::text   AS content_status,
      s.updated_at
    FROM content.school s
    LEFT JOIN ref.school_category sc ON sc.id = s.category_id
    LEFT JOIN ref.dzongkhag d ON d.id = s.dzongkhag_id
    WHERE s.id = $1
  `, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as SchoolFull;
}

export interface HealthCenterFull {
  id: number;
  name_en: string;
  name_dz: string | null;
  name_old: string | null;
  description: string | null;
  remarks: string | null;
  type: string;                 // ref.health_center_type.code
  type_id: number;
  type_full_form: string | null;
  status: string;
  beds: number | null;
  year_established: number | null;
  lon: number | null;
  lat: number | null;
  elevation_m: number | null;
  dzongkhag_id: number | null;
  dzongkhag_label: string | null;
  gewog_id: number | null;
  chiwog_id: number | null;
  nearest_locality_id: number | null;
  nearest_locality_label: string | null;
  has_helipad: number;
  requires_4wd_access: number;
  nearest_road_access_km: number | null;
  content_status: 'draft' | 'in_review' | 'published' | 'archived';
  updated_at: string | null;
}

export async function getHealthCenterById(id: number): Promise<HealthCenterFull | null> {
  const r = await q(`
    SELECT
      h.id,
      h.name_en,
      h.name_dz,
      h.name_old,
      h.description,
      h.remarks,
      hct.code                      AS type,
      h.type_id                     AS type_id,
      hct.full_form                 AS type_full_form,
      h.status::text                AS status,
      h.beds,
      h.year_established,
      ST_X(h.geom::geometry)        AS lon,
      ST_Y(h.geom::geometry)        AS lat,
      h.elevation_m,
      h.dzongkhag_id,
      d.name_en                     AS dzongkhag_label,
      h.gewog_id,
      h.chiwog_id,
      h.nearest_locality_id,
      nl.name_en                    AS nearest_locality_label,
      (h.has_helipad)::int          AS has_helipad,
      (h.requires_4wd_access)::int  AS requires_4wd_access,
      h.nearest_road_access_km,
      h.content_status::text        AS content_status,
      h.updated_at
    FROM content.health_center h
    JOIN ref.health_center_type hct ON hct.id = h.type_id
    LEFT JOIN ref.dzongkhag d     ON d.id  = h.dzongkhag_id
    LEFT JOIN content.locality nl ON nl.id = h.nearest_locality_id
    WHERE h.id = $1
  `, [id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } as HealthCenterFull;
}

// ── ref.dzongkhag editor (districts) ────────────────────────────────────────

export interface RefDzongkhag {
  id: number;
  code: string | null;
  name_en: string;
  name_dz: string | null;
  region: 'east' | 'west' | 'central' | 'south' | null;
  usage_count: number;
}

export async function getRefDzongkhags(): Promise<RefDzongkhag[]> {
  const r = await q(`
    SELECT
      dz.id,
      dz.code,
      dz.name_en,
      dz.name_dz,
      dz.region::text AS region,
      (SELECT COUNT(*)::int FROM ref.gewog g WHERE g.dzongkhag_id = dz.id) AS usage_count
    FROM ref.dzongkhag dz
    ORDER BY dz.region NULLS LAST, dz.name_en
  `);
  return r.rows as RefDzongkhag[];
}

// ── geometry fetch (for the map editors) ────────────────────────────────────
//
// All geom-bearing content tables share the same column name (`geom`). This
// helper fetches the geometry as GeoJSON for the map preview / editor. The
// `entity` arg is whitelisted server-side; we never accept untrusted SQL.

const GEOM_TABLES: Record<string, string> = {
  trek_route:        'content.trek_route',
  waypoint:          'content.waypoint',
  heritage_site:     'content.heritage_site',
  dzong:             'content.dzong',
  conservation_area: 'content.conservation_area',
  school:            'content.school',
  health_center:     'content.health_center',
  locality:          'content.locality',
};

export type GeomFeatureType = keyof typeof GEOM_TABLES;

/** Discriminated-union GeoJSON geometry; matches the MapView component's GeomGeoJSON type. */
export type GeomGeoJSONShape =
  | { type: 'Point';           coordinates: [number, number] }
  | { type: 'LineString';      coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }
  | { type: 'Polygon';         coordinates: [number, number][][] }
  | { type: 'MultiPolygon';    coordinates: [number, number][][][] };

export async function getGeomById(entity: GeomFeatureType, id: number): Promise<GeomGeoJSONShape | null> {
  const table = GEOM_TABLES[entity];
  if (!table) return null;
  const r = await q(`SELECT ST_AsGeoJSON(geom)::jsonb AS g FROM ${table} WHERE id = $1`, [id]);
  if (!r.rows[0] || !r.rows[0].g) return null;
  return r.rows[0].g as GeomGeoJSONShape;
}

// ── legacy compatibility shim ───────────────────────────────────────────────
// A handful of pages reach for `getDb()` directly to run ad-hoc SQL. Provide
// a thin shim that lets them keep working until they're migrated to named
// helpers. Calls return promises now.
export function getDb() {
  return {
    prepare(sql: string) {
      return {
        async get(...params: unknown[]) {
          const r = await q(sql, params);
          return r.rows[0] ?? null;
        },
        async all(...params: unknown[]) {
          const r = await q(sql, params);
          return r.rows;
        },
      };
    },
    pragma() { /* no-op for compat */ },
  };
}
