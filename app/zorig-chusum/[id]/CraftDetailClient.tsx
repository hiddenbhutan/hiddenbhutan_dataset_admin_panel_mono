'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import type { ZorigChusum, MediaItem } from '@/lib/db';
import { updateZorigChusum, setZorigChusumStatus, deleteZorigChusum } from '@/lib/actions/zorig-chusum';
import {
  StatusBadge,
  StatusActions,
  DiscardSaveButtons,
  DeleteButton,
  FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import EditableTagList from '@/components/EditableTagList';

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-[#424844] mb-1.5 block font-semibold uppercase tracking-wide">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[#727973]" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-[#e8e2d7] mb-4">
      <p className="font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{title}</p>
    </div>
  );
}

export default function CraftDetailClient({ craft, media }: { craft: ZorigChusum; media: MediaItem[] }) {
  const [data, setData] = useState({ ...craft });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(craft.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(craft.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof ZorigChusum>(key: K, value: ZorigChusum[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    setDirty(true);
  }, []);

  function handleSave() {
    const patch = {
      slug:            data.slug,
      ordinal:         data.ordinal,
      name_en:         data.name_en,
      name_dz:         data.name_dz,
      name_romanized:  data.name_romanized,
      short_summary:   data.short_summary,
      description:     data.description,
      history:         data.history,
      tools:           data.tools,
      // toJsonbArray transform splits on newline or " • " — feed multi-line text.
      masters:         data.masters ? data.masters.join('\n') : null,
      where_practiced: data.where_practiced ? data.where_practiced.join('\n') : null,
    };
    startTransition(async () => {
      const res = await updateZorigChusum(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name_en}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        toast.error(res.message ?? 'Please fix the highlighted fields');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setZorigChusumStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <Link href="/zorig-chusum" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Zorig Chusum
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#082619', color: '#ffdea3' }}>
                {data.ordinal}
              </span>
              <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#dae69f', color: '#5d682e', fontSize: '11px' }}>Zorig Chusum</span>
              <span className="font-mono text-[#727973] text-sm border border-[#c2c8c2] px-2 py-0.5 rounded">ZC-{data.id}</span>
              {data.slug && <span className="font-mono text-[#727973]" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {(data.name_dz || data.name_romanized) && (
              <p className="italic text-[#727973] mt-0.5" style={{ fontSize: '14px' }}>
                {[data.name_dz, data.name_romanized].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...craft }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteZorigChusum(data.id)}
              redirectTo="/zorig-chusum" entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 space-y-4">
          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5 space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en} onChange={e => update('name_en', e.target.value)} className="border-[#c2c8c2] h-9 text-sm" />
                      <FieldError message={errors.name_en} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm italic" />
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Ordinal" hint="1–13 canonical numbering.">
                      <Input type="number" min={1} max={13} value={data.ordinal} onChange={e => update('ordinal', Number(e.target.value))} className="border-[#c2c8c2] h-9 text-sm" />
                      <FieldError message={errors.ordinal} />
                    </F>
                    <F label="Slug">
                      <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm font-mono" />
                      <FieldError message={errors.slug} />
                    </F>
                  </div>
                </div>
              </div>
              <div>
                <S title="Content" />
                <div className="space-y-3">
                  <F label="Short summary" hint="One-line blurb shown on cards.">
                    <Textarea value={data.short_summary ?? ''} onChange={e => update('short_summary', e.target.value || null)} rows={2} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)} rows={5} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="History">
                    <Textarea value={data.history ?? ''} onChange={e => update('history', e.target.value || null)} rows={4} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Tools &amp; materials" hint="Free-form text — promote to a normalized table later if needed.">
                    <Textarea value={data.tools ?? ''} onChange={e => update('tools', e.target.value || null)} rows={3} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5 space-y-4">
          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5">
              <S title="Notable masters" />
              <EditableTagList
                items={data.masters ?? []}
                onChange={v => update('masters', v.length ? v : null)}
                placeholder="Add master practitioner…" />
            </CardContent>
          </Card>
          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5">
              <S title="Where practiced" />
              <EditableTagList
                items={data.where_practiced ?? []}
                onChange={v => update('where_practiced', v.length ? v : null)}
                placeholder="Add dzongkhag / locality…"
                tagStyle="gold" />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-[#c2c8c2] bg-white">
        <CardContent className="p-5">
          <S title="Media" />
          <EntityMediaPanel
            entityType="zorig_chusum"
            entityId={craft.id}
            items={media}
            revalidatePaths={[`/zorig-chusum/${craft.id}`, '/media']}
          />
        </CardContent>
      </Card>
    </div>
  );
}
