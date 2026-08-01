'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import type { Thangka, ThangkaStyle, ThangkaFestivalDisplay, RefOption, MediaItem } from '@/lib/db';
import { updateThangka, setThangkaStatus, deleteThangka } from '@/lib/actions/thangkas';
import {
  StatusBadge, StatusActions, DiscardSaveButtons, DeleteButton, FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STYLE_OPTS: Array<{ value: ThangkaStyle; label: string }> = [
  { value: 'religious_painted',     label: 'Painted' },
  { value: 'religious_appliqué',    label: 'Appliqué' },
  { value: 'religious_embroidered', label: 'Embroidered' },
  { value: 'thongdrol',             label: 'Thongdrol' },
  { value: 'mandala',               label: 'Mandala' },
  { value: 'lineage_portrait',      label: 'Lineage portrait' },
  { value: 'other',                 label: 'Other' },
];

type OriginMode = 'none' | 'dzong' | 'heritage';

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-on-primary-fixed-variant mb-1.5 block uppercase" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-outline" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-outline-variant mb-4">
      <p className="font-bold uppercase text-on-primary-fixed-variant" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>{title}</p>
    </div>
  );
}

export default function ThangkaDetailClient({
  thangka, figures, dzongs, heritageSites, festivalDisplays, media,
}: {
  thangka: Thangka;
  figures: RefOption[];
  dzongs: RefOption[];
  heritageSites: RefOption[];
  festivalDisplays: ThangkaFestivalDisplay[];
  media: MediaItem[];
}) {
  const initialOrigin: OriginMode =
    thangka.origin_dzong_id ? 'dzong'
    : thangka.origin_heritage_site_id ? 'heritage'
    : 'none';

  const [data, setData] = useState({ ...thangka });
  const [originMode, setOriginMode] = useState<OriginMode>(initialOrigin);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(thangka.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(thangka.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof Thangka>(key: K, value: Thangka[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    setDirty(true);
  }, []);

  function onStyleChange(next: ThangkaStyle) {
    setData(prev => ({
      ...prev,
      style: next,
      // CHECK constraint: thongdrol flag requires style=thongdrol.
      // If switching away from thongdrol, clear the flag.
      is_thongdrol: next === 'thongdrol' ? prev.is_thongdrol : 0,
    }));
    setDirty(true);
  }

  function onThongdrolToggle(v: boolean) {
    if (v && data.style !== 'thongdrol') {
      toast.error('Set style to "Thongdrol" first');
      return;
    }
    update('is_thongdrol', v ? 1 : 0);
  }

  function onOriginModeChange(mode: OriginMode) {
    setOriginMode(mode);
    setData(prev => ({
      ...prev,
      origin_dzong_id:         mode === 'dzong'    ? prev.origin_dzong_id         : null,
      origin_heritage_site_id: mode === 'heritage' ? prev.origin_heritage_site_id : null,
    }));
    setDirty(true);
  }

  function handleSave() {
    const patch = {
      name:                       data.name_en,
      name_dz:                    data.name_dz,
      name_romanized:             data.name_romanized,
      slug:                       data.slug,
      style:                      data.style,
      is_thongdrol:               data.is_thongdrol,
      depicts:                    data.depicts,
      iconographic_notes:         data.iconographic_notes,
      meaning:                    data.meaning,
      significance:               data.significance,
      folklore:                   data.folklore,
      height_cm:                  data.height_cm,
      width_cm:                   data.width_cm,
      materials:                  data.materials,
      commissioned_year:          data.commissioned_year,
      commissioned_by_figure_id:  data.commissioned_by_figure_id,
      artist_attribution:         data.artist_attribution,
      origin_dzong_id:            originMode === 'dzong'    ? data.origin_dzong_id         : null,
      origin_heritage_site_id:    originMode === 'heritage' ? data.origin_heritage_site_id : null,
    };
    startTransition(async () => {
      const res = await updateThangka(data.id, patch, updatedAt ?? undefined);
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
      const res = await setThangkaStatus(data.id, next, updatedAt ?? undefined);
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
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href="/thangkas"
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Thangkas
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.is_thongdrol ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                  <Sparkles size={11} /> Thongdrol
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {STYLE_OPTS.find(o => o.value === data.style)?.label ?? data.style}
                </span>
              )}
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>T-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {(data.name_dz || data.name_romanized) && (
              <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>
                {[data.name_dz, data.name_romanized].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => {
                setData({ ...thangka });
                setOriginMode(initialOrigin);
                setDirty(false);
              }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteThangka(data.id)}
              redirectTo="/thangkas" entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en} onChange={e => update('name_en', e.target.value)} className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.name} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)} className="border-outline-variant h-9 text-sm italic" />
                    </F>
                  </div>
                  <F label="Slug">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-outline-variant h-9 text-sm font-mono" />
                    <FieldError message={errors.slug} />
                  </F>
                </div>
              </div>

              <div>
                <S title="Iconography" />
                <div className="space-y-3">
                  <F label="Depicts" hint="Who/what is shown — primary figure(s), deities, or scene.">
                    <Input value={data.depicts ?? ''} onChange={e => update('depicts', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Iconographic notes" hint="Mudras, attributes, retinue, color symbolism.">
                    <Textarea value={data.iconographic_notes ?? ''} onChange={e => update('iconographic_notes', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Meaning" hint="Doctrinal or symbolic meaning.">
                    <Textarea value={data.meaning ?? ''} onChange={e => update('meaning', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Significance" hint="Ritual / cultural significance.">
                    <Textarea value={data.significance ?? ''} onChange={e => update('significance', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Folklore">
                    <Textarea value={data.folklore ?? ''} onChange={e => update('folklore', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Provenance" />
                <div className="grid grid-cols-3 gap-3">
                  <F label="Commissioned year">
                    <Input type="number" value={data.commissioned_year ?? ''}
                      onChange={e => update('commissioned_year', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                    <FieldError message={errors.commissioned_year} />
                  </F>
                  <F label="Commissioned by (figure)">
                    <Select value={data.commissioned_by_figure_id ? String(data.commissioned_by_figure_id) : '__none'}
                      onValueChange={(v) => update('commissioned_by_figure_id', v === '__none' ? null : Number(v))}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {figures.map(f => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Artist attribution">
                    <Input value={data.artist_attribution ?? ''} onChange={e => update('artist_attribution', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>

          {festivalDisplays.length > 0 && (
            <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
              <CardContent className="p-5">
                <S title={`Displayed at ${festivalDisplays.length} festival${festivalDisplays.length === 1 ? '' : 's'}`} />
                <div className="space-y-2">
                  {festivalDisplays.map(d => (
                    <div key={d.festival_id} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg bg-surface-container">
                      <div>
                        <Link href={`/festivals/${d.festival_id}`} className="font-semibold text-on-surface hover:text-on-primary-fixed-variant" style={{ fontSize: '14px' }}>{d.festival_name}</Link>
                        {d.notes && <p className="text-on-surface-variant" style={{ fontSize: '12px' }}>{d.notes}</p>}
                      </div>
                      <div className="text-right text-on-surface-variant" style={{ fontSize: '12px', fontFamily: 'var(--font-mono, JetBrains Mono, ui-monospace)' }}>
                        {d.day_of_festival ? `Day ${d.day_of_festival}` : '—'}
                        {d.time_of_day && <span> · {d.time_of_day}</span>}
                        {d.display_duration_min && <span> · {d.display_duration_min}min</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Style" />
              <F label="Style">
                <Select value={data.style} onValueChange={(v) => onStyleChange(v as ThangkaStyle)}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError message={errors.style} />
              </F>
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Thongdrol</Label>
                <Switch checked={!!data.is_thongdrol}
                  onCheckedChange={onThongdrolToggle}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              <p className="text-outline" style={{ fontSize: '11px' }}>
                Schema requires style = thongdrol when this flag is set.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Physical" />
              <div className="grid grid-cols-2 gap-3">
                <F label="Height (cm)">
                  <Input type="number" min={1} value={data.height_cm ?? ''}
                    onChange={e => update('height_cm', e.target.value ? Number(e.target.value) : null)}
                    className="border-outline-variant h-9 text-sm font-mono" />
                  <FieldError message={errors.height_cm} />
                </F>
                <F label="Width (cm)">
                  <Input type="number" min={1} value={data.width_cm ?? ''}
                    onChange={e => update('width_cm', e.target.value ? Number(e.target.value) : null)}
                    className="border-outline-variant h-9 text-sm font-mono" />
                  <FieldError message={errors.width_cm} />
                </F>
              </div>
              <F label="Materials" hint="Silk, brocade, gold thread…">
                <Textarea value={data.materials ?? ''} onChange={e => update('materials', e.target.value || null)} rows={2} className="border-outline-variant text-sm resize-none" />
              </F>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Origin" />
              <F label="Lives at" hint="Exactly one — or none (if origin is unknown).">
                <Select value={originMode} onValueChange={(v) => onOriginModeChange(v as OriginMode)}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unknown</SelectItem>
                    <SelectItem value="dzong">Dzong</SelectItem>
                    <SelectItem value="heritage">Heritage site</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              {originMode === 'dzong' && (
                <F label="Origin dzong">
                  <Select value={data.origin_dzong_id ? String(data.origin_dzong_id) : '__none'}
                    onValueChange={(v) => update('origin_dzong_id', v === '__none' ? null : Number(v))}>
                    <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Select dzong" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Select —</SelectItem>
                      {dzongs.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
              )}
              {originMode === 'heritage' && (
                <F label="Origin heritage site">
                  <Select value={data.origin_heritage_site_id ? String(data.origin_heritage_site_id) : '__none'}
                    onValueChange={(v) => update('origin_heritage_site_id', v === '__none' ? null : Number(v))}>
                    <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Select heritage site" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Select —</SelectItem>
                      {heritageSites.map(h => (
                        <SelectItem key={h.id} value={String(h.id)}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <CardHeader className="pb-3">
          <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Media</CardTitle>
        </CardHeader>
        <CardContent>
          <EntityMediaPanel
            entityType="thangka"
            entityId={thangka.id}
            items={media}
            revalidatePaths={[`/thangkas/${thangka.id}`, '/media']}
          />
        </CardContent>
      </Card>
    </div>
  );
}
