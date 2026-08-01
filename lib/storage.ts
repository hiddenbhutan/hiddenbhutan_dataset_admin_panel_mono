/**
 * Supabase Storage client for the media library. Talks to the Storage REST
 * API directly with the service-role key — no supabase-js dependency needed
 * for the handful of operations the admin panel does (upload, delete).
 */

import 'server-only';

function config() {
  const url = process.env.SUPABASE_STORAGE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_MEDIA_BUCKET;
  if (!url || !key || !bucket) {
    throw new Error(
      'Supabase Storage is not configured — set SUPABASE_STORAGE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_MEDIA_BUCKET in .env.local',
    );
  }
  return { url, key, bucket };
}

/** Uploads a buffer to the media bucket at `key`, overwriting any existing object. Returns the public CDN URL. */
export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<{ cdnUrl: string }> {
  const { url, key: apiKey, bucket } = config();
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }
  return { cdnUrl: `${url}/storage/v1/object/public/${bucket}/${key}` };
}

/** Deletes an object from the media bucket. Never throws — a failed storage
 * delete shouldn't block the caller from removing the DB row. */
export async function deleteFromStorage(key: string): Promise<void> {
  try {
    const { url, key: apiKey, bucket } = config();
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`Storage delete failed for ${key}: ${res.status} ${await res.text().catch(() => '')}`);
    }
  } catch (e) {
    console.error(`Storage delete threw for ${key}:`, e);
  }
}
