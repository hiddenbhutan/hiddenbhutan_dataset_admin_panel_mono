'use server';

import 'server-only';
import { randomUUID, createHash } from 'crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getCurrentAdminUser } from '../auth';
import { uploadToStorage, deleteFromStorage } from '../storage';
import {
  applyPatch,
  transitionStatus,
  deleteRecord,
  pool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type DeleteResult,
} from './_shared';
import type { MediaEntityType } from '../db';

const ENTITY_TYPES = [
  'locality', 'trek_route', 'waypoint', 'heritage_site', 'dzong', 'dzong_lhakhang',
  'health_center', 'school', 'conservation_area', 'biological_corridor', 'festival',
  'thangka', 'cuisine_item', 'cuisine_ingredient', 'species', 'species_occurrence',
  'historical_figure', 'zorig_chusum', 'national_symbol', 'cultural_custom', 'traditional_game',
] as const satisfies readonly MediaEntityType[];

const LICENSE_VALUES = [
  'all_rights_reserved', 'cc0', 'cc_by', 'cc_by_sa', 'cc_by_nc',
  'cc_by_nc_sa', 'public_domain', 'used_with_permission',
] as const;

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB — well above any real trail photo
const MAX_DIMENSION = 1600; // matches the Wikimedia-sourced hero images already in place

export interface UploadResult {
  ok: boolean;
  message?: string;
  id?: number;
}

/** Validates an incoming form file against the shared image-upload constraints. */
function validateImageFile(file: FormDataEntryValue | null): { ok: true; file: File } | { ok: false; message: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'No file selected' };
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: `Unsupported file type: ${file.type || 'unknown'}. Images only.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max 20MB.` };
  }
  return { ok: true, file };
}

/** Auto-orients, resizes to fit MAX_DIMENSION, and re-encodes as WebP. */
async function optimizeImage(file: File): Promise<{ optimized: Buffer; width: number; height: number; sha256: string }> {
  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(input).rotate().resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  }).webp({ quality: 82 });
  const optimized = await pipeline.toBuffer();
  const meta = await sharp(optimized).metadata();
  const sha256 = createHash('sha256').update(optimized).digest('hex');
  return { optimized, width: meta.width ?? 0, height: meta.height ?? 0, sha256 };
}

/**
 * Optimizes an uploaded image (auto-orient, resize to fit MAX_DIMENSION,
 * re-encode as WebP) and inserts a content.media row for it. Runs entirely
 * server-side — the browser never talks to Supabase Storage directly.
 */
export async function uploadMediaAction(formData: FormData): Promise<UploadResult> {
  const entityType = formData.get('entityType');
  const entityIdRaw = formData.get('entityId');
  const revalidatePaths = String(formData.get('revalidatePaths') ?? '').split(',').filter(Boolean);

  if (typeof entityType !== 'string' || !ENTITY_TYPES.includes(entityType as MediaEntityType)) {
    return { ok: false, message: 'Invalid or missing entity type' };
  }
  const entityId = Number(entityIdRaw);
  if (!Number.isFinite(entityId) || entityId <= 0) {
    return { ok: false, message: 'Invalid or missing entity id' };
  }
  const validated = validateImageFile(formData.get('file'));
  if (!validated.ok) return { ok: false, message: validated.message };
  const file = validated.file;

  const user = await getCurrentAdminUser();

  let optimized: Buffer;
  let width: number;
  let height: number;
  let sha256: string;
  try {
    ({ optimized, width, height, sha256 } = await optimizeImage(file));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Image processing failed: ${msg}` };
  }

  const storageKey = `${entityType}/${entityId}/${randomUUID()}.webp`;

  let cdnUrl: string;
  try {
    ({ cdnUrl } = await uploadToStorage(storageKey, optimized, 'image/webp'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Upload failed: ${msg}` };
  }

  const altText = (formData.get('altText') as string | null)?.trim() || null;
  const caption = (formData.get('caption') as string | null)?.trim() || null;
  const photographer = (formData.get('photographer') as string | null)?.trim() || null;
  const licenseRaw = formData.get('license') as string | null;
  const license = licenseRaw && LICENSE_VALUES.includes(licenseRaw as (typeof LICENSE_VALUES)[number])
    ? licenseRaw
    : 'all_rights_reserved';
  const licenseNotes = (formData.get('licenseNotes') as string | null)?.trim() || null;

  try {
    const r = await pool().query<{ id: number }>(
      `INSERT INTO content.media
         (entity_type, entity_id, kind, storage_key, cdn_url, mime_type, byte_size,
          width_px, height_px, sha256, alt_text, caption, photographer, license, license_notes,
          content_status, created_by, updated_by)
       VALUES
         ($1::content.entity_type, $2, 'image', $3, $4, 'image/webp', $5,
          $6, $7, $8, $9, $10, $11, $12::content.media_license, $13,
          'draft', $14, $14)
       RETURNING id`,
      [entityType, entityId, storageKey, cdnUrl, optimized.byteLength,
       width, height, sha256, altText, caption, photographer, license, licenseNotes,
       user.id],
    );
    const id = r.rows[0]?.id;
    if (!id) return { ok: false, message: 'Insert returned no row' };
    revalidatePaths.forEach((p) => revalidatePath(p));
    return { ok: true, id };
  } catch (e) {
    // Best-effort cleanup so a failed insert doesn't leave an orphaned object.
    await deleteFromStorage(storageKey);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Save failed: ${msg}` };
  }
}

/**
 * Replaces the image file behind an existing content.media row — re-runs the
 * same sharp optimization pipeline and overwrites the existing storage
 * object in place, so storage_key/cdn_url (and any external references)
 * stay unchanged. Only usable on kind='image' rows.
 */
export async function replaceMediaFileAction(id: number, formData: FormData): Promise<UploadResult> {
  if (!Number.isFinite(id) || id <= 0) return { ok: false, message: 'Invalid id' };
  const validated = validateImageFile(formData.get('file'));
  if (!validated.ok) return { ok: false, message: validated.message };
  const file = validated.file;
  const revalidatePaths = String(formData.get('revalidatePaths') ?? '').split(',').filter(Boolean);

  const user = await getCurrentAdminUser();

  const existing = await pool().query<{ storage_key: string; kind: string }>(
    `SELECT storage_key, kind::text AS kind FROM content.media WHERE id = $1`,
    [id],
  );
  const row = existing.rows[0];
  if (!row) return { ok: false, message: 'Media row not found' };
  if (row.kind !== 'image') return { ok: false, message: `Cannot replace a ${row.kind} file this way` };

  let optimized: Buffer;
  let width: number;
  let height: number;
  let sha256: string;
  try {
    ({ optimized, width, height, sha256 } = await optimizeImage(file));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Image processing failed: ${msg}` };
  }

  let cdnUrl: string;
  try {
    ({ cdnUrl } = await uploadToStorage(row.storage_key, optimized, 'image/webp'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Upload failed: ${msg}` };
  }
  // storage_key (and thus the base cdn_url) is unchanged on a replace, so
  // append a content-hash query param to bust any browser/CDN image cache.
  cdnUrl = `${cdnUrl}?v=${sha256.slice(0, 12)}`;

  try {
    const r = await pool().query<{ id: number }>(
      `UPDATE content.media
          SET cdn_url = $2, mime_type = 'image/webp', byte_size = $3,
              width_px = $4, height_px = $5, sha256 = $6,
              updated_at = now(), updated_by = $7
        WHERE id = $1
        RETURNING id`,
      [id, cdnUrl, optimized.byteLength, width, height, sha256, user.id],
    );
    if (!r.rows[0]) return { ok: false, message: 'Update returned no row' };
    revalidatePaths.forEach((p) => revalidatePath(p));
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Save failed: ${msg}` };
  }
}

const FIELDS: Record<string, FieldDef> = {
  alt_text:      { column: 'alt_text' },
  caption:       { column: 'caption' },
  photographer:  { column: 'photographer' },
  license:       { column: 'license', cast: 'content.media_license' },
  license_notes: { column: 'license_notes' },
};

const Schema = z.object({
  alt_text:      z.string().max(300).optional().nullable(),
  caption:       z.string().max(1000).optional().nullable(),
  photographer:  z.string().max(200).optional().nullable(),
  license:       z.enum(LICENSE_VALUES).optional(),
  license_notes: z.string().max(2000).optional().nullable(),
}).strip();

export async function updateMediaMetaAction(
  id: number,
  patch: Record<string, unknown>,
  revalidatePaths: string[],
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'media',
    id,
    fields: FIELDS,
    patch,
    revalidate: revalidatePaths,
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setMediaStatusAction(
  id: number,
  newStatus: ContentStatus,
  revalidatePaths: string[],
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'media',
    id,
    newStatus,
    revalidate: revalidatePaths,
    expectedUpdatedAt,
  });
}

/** Clears is_primary on every other media row for this entity, then sets it on `id`. */
export async function setMediaPrimaryAction(
  id: number,
  entityType: MediaEntityType,
  entityId: number,
  revalidatePaths: string[],
): Promise<ActionResult> {
  if (!Number.isFinite(id) || id <= 0) return { ok: false, message: 'Invalid id' };
  await getCurrentAdminUser();
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE content.media SET is_primary = false
        WHERE entity_type = $1::content.entity_type AND entity_id = $2 AND is_primary`,
      [entityType, entityId],
    );
    const r = await client.query<{ content_status: ContentStatus; updated_at: Date }>(
      `UPDATE content.media SET is_primary = true, updated_at = now()
        WHERE id = $1
        RETURNING content_status::text AS content_status, updated_at`,
      [id],
    );
    if (!r.rows[0]) {
      await client.query('ROLLBACK');
      return { ok: false, message: 'Row not found' };
    }
    await client.query('COMMIT');
    revalidatePaths.forEach((p) => revalidatePath(p));
    return {
      ok: true,
      message: 'Set as primary',
      contentStatus: r.rows[0].content_status,
      updatedAt: r.rows[0].updated_at?.toISOString?.() ?? r.rows[0].updated_at,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Failed: ${msg}` };
  } finally {
    client.release();
  }
}

export async function deleteMediaAction(
  id: number,
  storageKey: string,
  revalidatePaths: string[],
): Promise<DeleteResult> {
  await deleteFromStorage(storageKey);
  return deleteRecord({
    schema: 'content',
    table: 'media',
    id,
    revalidate: revalidatePaths,
  });
}
