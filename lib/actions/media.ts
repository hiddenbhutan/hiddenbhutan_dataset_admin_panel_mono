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

/**
 * Optimizes an uploaded image (auto-orient, resize to fit MAX_DIMENSION,
 * re-encode as WebP) and inserts a content.media row for it. Runs entirely
 * server-side — the browser never talks to Supabase Storage directly.
 */
export async function uploadMediaAction(formData: FormData): Promise<UploadResult> {
  const entityType = formData.get('entityType');
  const entityIdRaw = formData.get('entityId');
  const file = formData.get('file');
  const revalidatePaths = String(formData.get('revalidatePaths') ?? '').split(',').filter(Boolean);

  if (typeof entityType !== 'string' || !ENTITY_TYPES.includes(entityType as MediaEntityType)) {
    return { ok: false, message: 'Invalid or missing entity type' };
  }
  const entityId = Number(entityIdRaw);
  if (!Number.isFinite(entityId) || entityId <= 0) {
    return { ok: false, message: 'Invalid or missing entity id' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'No file selected' };
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: `Unsupported file type: ${file.type || 'unknown'}. Images only.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max 20MB.` };
  }

  const user = await getCurrentAdminUser();

  let optimized: Buffer;
  let width: number;
  let height: number;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(input).rotate().resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    }).webp({ quality: 82 });
    optimized = await pipeline.toBuffer();
    const meta = await sharp(optimized).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Image processing failed: ${msg}` };
  }

  const sha256 = createHash('sha256').update(optimized).digest('hex');
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
