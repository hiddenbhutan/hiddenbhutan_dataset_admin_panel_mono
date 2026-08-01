'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Star, Pencil, Trash2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import type { MediaItem, MediaLicense } from '@/lib/db';
import {
  setMediaPrimaryAction, setMediaStatusAction, deleteMediaAction,
} from '@/lib/actions/media';
import type { ContentStatus } from '@/lib/actions/_shared';
import MediaThumb from '@/app/media/MediaThumb';
import MediaEditDialog from './MediaEditDialog';

const LICENSE_LABEL: Record<MediaLicense, { label: string; bg: string; color: string }> = {
  all_rights_reserved:  { label: 'All rights',   bg: '#ffdad6', color: '#93000a' },
  cc0:                  { label: 'CC0',          bg: '#c9ead6', color: '#1a4d2a' },
  cc_by:                { label: 'CC BY',        bg: '#c9ead6', color: '#1a4d2a' },
  cc_by_sa:             { label: 'CC BY-SA',     bg: '#c9ead6', color: '#1a4d2a' },
  cc_by_nc:             { label: 'CC BY-NC',     bg: '#fdefd8', color: '#7a4a10' },
  cc_by_nc_sa:          { label: 'CC BY-NC-SA',  bg: '#fdefd8', color: '#7a4a10' },
  public_domain:        { label: 'Public domain', bg: '#dae69f', color: '#5d682e' },
  used_with_permission: { label: 'With permission', bg: '#d6e8f0', color: '#2c5a70' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const KIND_LABEL: Record<MediaItem['kind'], string> = {
  image: 'Image', video: 'Video', audio: 'Audio', panorama_360: '360°', model_3d: '3D',
};

function formatBytes(n: number | null): string {
  if (!n) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function MediaCard({
  item,
  revalidatePaths,
  entityHref,
  showEntityLabel,
}: {
  item: MediaItem;
  revalidatePaths: string[];
  /** Link to the owning entity's detail page — omit on entity-scoped panels (redundant there). */
  entityHref?: string;
  showEntityLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const lic = LICENSE_LABEL[item.license];
  const cs = CONTENT_STATUS[item.content_status] ?? CONTENT_STATUS.draft;

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(res.message ?? 'Done');
        router.refresh();
      } else {
        toast.error(res.message ?? 'Action failed');
      }
    });
  }

  function handleSetPrimary() {
    run(() => setMediaPrimaryAction(item.id, item.entity_type, item.entity_id, revalidatePaths));
  }

  function handleStatus(next: ContentStatus) {
    run(() => setMediaStatusAction(item.id, next, revalidatePaths, item.updated_at ?? undefined));
  }

  function handleDelete() {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    run(() => deleteMediaAction(item.id, item.storage_key, revalidatePaths));
  }

  return (
    <div className="group relative rounded-lg overflow-hidden border border-[#c2c8c2]"
      style={{ aspectRatio: '4/3', backgroundColor: '#f3ede2' }}>
      <MediaThumb item={item} />

      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
        {item.is_primary ? (
          <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '9px' }}>
            Hero
          </span>
        ) : null}
        {item.kind !== 'image' && (
          <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#082619', color: '#ffdea3', fontSize: '9px' }}>
            {KIND_LABEL[item.kind]}
          </span>
        )}
      </div>

      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
        <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '9px' }}>
          {cs.label}
        </span>
        <span className="px-1.5 py-0.5 rounded font-bold uppercase" title={lic.label} style={{ backgroundColor: lic.bg, color: lic.color, fontSize: '9px' }}>
          {lic.label}
        </span>
      </div>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to bottom, rgba(8,38,25,0.75), transparent)' }}>
        <button type="button" disabled={pending} onClick={() => setEditing(true)}
          title="Edit details"
          className="p-1.5 rounded bg-white/90 hover:bg-white text-[#304d3e] disabled:opacity-50">
          <Pencil size={13} />
        </button>
        {!item.is_primary && (
          <button type="button" disabled={pending} onClick={handleSetPrimary}
            title="Set as primary (hero) image"
            className="p-1.5 rounded bg-white/90 hover:bg-white text-[#304d3e] disabled:opacity-50">
            <Star size={13} />
          </button>
        )}
        {item.content_status === 'draft' && (
          <button type="button" disabled={pending} onClick={() => handleStatus('in_review')}
            title="Submit for review"
            className="p-1.5 rounded bg-white/90 hover:bg-white text-[#304d3e] disabled:opacity-50">
            <Eye size={13} />
          </button>
        )}
        {item.content_status === 'in_review' && (
          <button type="button" disabled={pending} onClick={() => handleStatus('published')}
            title="Publish"
            className="p-1.5 rounded bg-white/90 hover:bg-white text-[#1a4d2a] disabled:opacity-50">
            <CheckCircle2 size={13} />
          </button>
        )}
        {item.content_status === 'published' && (
          <button type="button" disabled={pending} onClick={() => handleStatus('in_review')}
            title="Unpublish"
            className="p-1.5 rounded bg-white/90 hover:bg-white text-[#304d3e] disabled:opacity-50">
            <EyeOff size={13} />
          </button>
        )}
        <button type="button" disabled={pending} onClick={handleDelete}
          title="Delete"
          className="p-1.5 rounded bg-white/90 hover:bg-white text-[#93000a] disabled:opacity-50">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex flex-col gap-0.5"
        style={{ backgroundColor: 'rgba(8,38,25,0.85)' }}>
        {showEntityLabel && (
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#304d3e', color: '#ffdea3', fontSize: '8px' }}>
              {showEntityLabel}
            </span>
            {entityHref ? (
              <Link href={entityHref} className="text-[#ffdea3] hover:underline truncate" style={{ fontSize: '10px' }}>
                {item.entity_name ?? `#${item.entity_id}`}
              </Link>
            ) : (
              <span className="text-[#708f7d] truncate" style={{ fontSize: '10px' }}>
                {item.entity_name ?? `#${item.entity_id}`}
              </span>
            )}
          </div>
        )}
        {item.alt_text && (
          <p className="text-[#ffdea3] truncate" style={{ fontSize: '10px' }} title={item.alt_text}>
            {item.alt_text}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 text-[#708f7d]" style={{ fontSize: '9px' }}>
          <span className="font-mono truncate">
            {item.width_px && item.height_px ? `${item.width_px}×${item.height_px}` : ''}
          </span>
          {item.byte_size != null && <span className="font-mono">{formatBytes(item.byte_size)}</span>}
        </div>
        {item.photographer && (
          <p className="text-[#708f7d] truncate italic" style={{ fontSize: '9px' }}>© {item.photographer}</p>
        )}
      </div>

      {editing && (
        <MediaEditDialog item={item} revalidatePaths={revalidatePaths} open={editing} onOpenChange={setEditing} />
      )}
    </div>
  );
}
