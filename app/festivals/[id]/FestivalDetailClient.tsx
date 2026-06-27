'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScrollText, Star, Users, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';

import type {
  Festival,
  FestivalAgendaItem,
  FestivalAudience,
  FestivalFee,
  FestivalFigureRow,
  FestivalHighlight,
  FestivalOccurrence,
  FestivalThangkaDisplay,
  FestivalTypeOption,
  FestivalVenue,
  FestivalVisitorTip,
} from '@/lib/db';
import { updateFestival, setFestivalStatus, deleteFestival } from '@/lib/actions/festivals';
import {
  StatusBadge,
  StatusActions,
  DiscardSaveButtons,
  DeleteButton,
  FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const AUDIENCE_OPTS: { value: FestivalAudience; label: string }[] = [
  { value: 'open_to_all',      label: 'Open to all' },
  { value: 'tourists_welcome', label: 'Tourists welcome' },
  { value: 'locals_preferred', label: 'Locals preferred' },
  { value: 'monastic_only',    label: 'Monastic only' },
  { value: 'closed',           label: 'Closed' },
];

const VENUE_KIND_LABEL: Record<string, string> = {
  dzong:         'Dzong',
  heritage_site: 'Heritage site',
  locality:      'Locality',
};

const VENUE_KIND_HREF: Record<string, string> = {
  dzong:         '/dzongs',
  heritage_site: '/heritage',
  locality:      '/villages',
};

const THANGKA_STYLE_LABEL: Record<string, string> = {
  religious_painted:     'Painted',
  'religious_appliqué':  'Appliqué',
  religious_embroidered: 'Embroidered',
  thongdrol:             'Thongdrol',
  mandala:               'Mandala',
  lineage_portrait:      'Lineage portrait',
  other:                 'Other',
};

// Typography helpers — design spec
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-on-surface-variant mb-1.5 block uppercase" style={labelCapsStyle}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-outline" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-outline-variant mb-4">
      <p className="text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>{title}</p>
    </div>
  );
}

export default function FestivalDetailClient({
  festival,
  occurrences,
  venues,
  highlights,
  tips,
  figures,
  thangkaDisplays,
  types,
}: {
  festival: Festival;
  occurrences: FestivalOccurrence[];
  venues: FestivalVenue[];
  highlights: FestivalHighlight[];
  tips: FestivalVisitorTip[];
  figures: FestivalFigureRow[];
  thangkaDisplays: FestivalThangkaDisplay[];
  types: FestivalTypeOption[];
}) {
  const [data, setData] = useState({ ...festival });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(festival.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(festival.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof Festival>(key: K, value: Festival[K]) => {
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
      name:             data.name,
      name_dz:          data.name_dz,
      name_romanized:   data.name_romanized,
      name_local:       data.name_local,
      slug:             data.slug,
      description:      data.description,
      significance:     data.significance,
      history:          data.history,
      folklore:         data.folklore,
      festival_type_id: data.festival_type_id,
      lunar_month:      data.lunar_month,
      lunar_day_start:  data.lunar_day_start,
      lunar_day_end:    data.lunar_day_end,
      duration_days:    data.duration_days,
      dress_code:       data.dress_code,
      audience:         data.audience,
    };
    startTransition(async () => {
      const res = await updateFestival(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        toast.error(res.message ?? 'Please fix the highlighted fields');
      } else if (res.conflict) {
        toast.error(res.message ?? 'Reload — someone else edited this row');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setFestivalStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const audienceLabel = AUDIENCE_OPTS.find(a => a.value === data.audience)?.label ?? data.audience;

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* Header */}
      <div>
        <Link href="/festivals" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Festivals
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.festival_type_label && (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase border border-outline-variant text-on-surface-variant" style={{ fontSize: '10px' }}>
                  {data.festival_type_label}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '10px' }}>
                {audienceLabel}
              </span>
              {data.thangka_display_count > 0 && (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '10px' }}>
                  <ScrollText size={10} /> {data.thangka_display_count} thangka
                </span>
              )}
              <span className="font-mono text-outline text-sm border border-outline-variant px-2 py-0.5 rounded">FS-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
              {data.name}
            </h1>
            {(data.name_dz || data.name_romanized || data.name_local) && (
              <p className="text-on-surface-variant mt-0.5" style={{ fontSize: '14px' }}>
                {[data.name_dz, data.name_romanized, data.name_local].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons
              dirty={dirty}
              pending={pending}
              onDiscard={() => { setData({ ...festival }); setDirty(false); }}
              onSave={handleSave}
            />
            <DeleteButton onDelete={() => deleteFestival(data.id)}
              redirectTo="/festivals" entityLabel={data.name} />
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <div className="col-span-7 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Editorial content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <F label="Name (English)">
                    <Input value={data.name} onChange={e => update('name', e.target.value)}
                      className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.name} />
                  </F>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm italic" />
                    </F>
                    <F label="Local">
                      <Input value={data.name_local ?? ''} onChange={e => update('name_local', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                  <F label="Slug" hint="URL identifier (lowercase, dashes).">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm font-mono" placeholder="e.g. paro-tshechu" />
                    <FieldError message={errors.slug} />
                  </F>
                </div>
              </div>

              <div>
                <S title="Classification" />
                <div className="grid grid-cols-2 gap-3">
                  <F label="Festival type">
                    <Select value={data.festival_type_id ? String(data.festival_type_id) : '__none'}
                      onValueChange={v => { if (v) update('festival_type_id', v === '__none' ? null : Number(v)); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.label}{t.is_religious ? '' : ' (secular)'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Audience">
                    <Select value={data.audience}
                      onValueChange={v => { if (v) update('audience', v as FestivalAudience); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                </div>
              </div>

              <div>
                <S title="Lunar timing" />
                <div className="grid grid-cols-4 gap-3">
                  <F label="Lunar month">
                    <Input type="number" min={1} max={12} value={data.lunar_month ?? ''}
                      onChange={e => update('lunar_month', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.lunar_month} />
                  </F>
                  <F label="Day start">
                    <Input type="number" min={1} max={30} value={data.lunar_day_start ?? ''}
                      onChange={e => update('lunar_day_start', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Day end">
                    <Input type="number" min={1} max={30} value={data.lunar_day_end ?? ''}
                      onChange={e => update('lunar_day_end', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Duration (days)">
                    <Input type="number" min={1} max={30} value={data.duration_days ?? ''}
                      onChange={e => update('duration_days', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                </div>
                <p className="text-outline mt-2" style={{ fontSize: '11px' }}>
                  Concrete Gregorian dates per year live in <code>festival_occurrence</code> — see the table below.
                </p>
              </div>

              <div>
                <S title="Narrative" />
                <div className="space-y-3">
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={5} className="border-outline-variant text-sm resize-none" placeholder="What happens at this festival…" />
                  </F>
                  <F label="Significance">
                    <Textarea value={data.significance ?? ''} onChange={e => update('significance', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" placeholder="Why this festival matters…" />
                  </F>
                  <F label="History">
                    <Textarea value={data.history ?? ''} onChange={e => update('history', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none" placeholder="Origin, evolution, royal patronage…" />
                  </F>
                  <F label="Folklore">
                    <Textarea value={data.folklore ?? ''} onChange={e => update('folklore', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" placeholder="Legends, oral traditions, miracles…" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Practical info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <F label="Dress code">
                <Textarea value={data.dress_code ?? ''} onChange={e => update('dress_code', e.target.value || null)}
                  rows={3} className="border-outline-variant text-sm resize-none"
                  placeholder="e.g. Gho/kira required at the dzong courtyard." />
              </F>

              <FeesDisplay fees={data.fees} />
              <AgendaDisplay agenda={data.agenda} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sub-tables */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 space-y-4">
          {/* Occurrences */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Occurrences (concrete Gregorian dates)</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {occurrences.length === 0 ? 'No occurrences recorded yet' : `${occurrences.length} most recent`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {occurrences.length === 0 ? (
                <EmptyRow message="Populate content.festival_occurrence to attach per-year dates." />
              ) : (
                <table className="w-full text-left">
                  <thead style={{ backgroundColor: '#ede8dd' }}>
                    <tr className="border-b border-outline-variant">
                      {['Year', 'Start', 'End', 'Confirmed', 'Source', 'Notes'].map(h => (
                        <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '11px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {occurrences.map(o => (
                      <tr key={o.id} className="hover:bg-surface-container">
                        <td className="px-4 py-2 font-mono text-on-surface" style={{ fontSize: '12px' }}>{o.year}</td>
                        <td className="px-4 py-2 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>{o.start_date}</td>
                        <td className="px-4 py-2 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>{o.end_date}</td>
                        <td className="px-4 py-2">
                          {o.is_confirmed ? (
                            <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#c9ead6', color: '#1a4d2a', fontSize: '10px' }}>Confirmed</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#e8e2d7', color: '#727973', fontSize: '10px' }}>Predicted</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-outline" style={{ fontSize: '11px' }}>{o.calendar_source ?? '—'}</td>
                        <td className="px-4 py-2 text-outline" style={{ fontSize: '11px', maxWidth: 180 }}>
                          <div className="truncate" title={o.notes ?? ''}>{o.notes ?? '—'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Venues */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Venues</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {venues.length === 0 ? 'No venues recorded yet' : `${venues.length} location${venues.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {venues.length === 0 ? (
                <EmptyRow message="Add rows to content.festival_venue (exactly one of dzong/heritage/locality)." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {venues.map(v => (
                    <li key={v.id} className="flex items-start gap-3 px-4 py-3">
                      <MapPin size={14} className="text-on-primary-fixed-variant flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {v.is_primary ? (
                            <span className="px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '9px' }}>Primary</span>
                          ) : null}
                          <span className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>{v.name}</span>
                          <span className="px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant" style={{ fontSize: '10px' }}>{VENUE_KIND_LABEL[v.kind]}</span>
                          {v.district && <span className="text-outline" style={{ fontSize: '11px' }}>{v.district}</span>}
                          {v.kind === 'dzong' && v.dzong_id != null && (
                            <Link href={`${VENUE_KIND_HREF[v.kind]}/${v.dzong_id}`} className="text-on-primary-fixed-variant hover:underline" style={{ fontSize: '11px' }}>↗</Link>
                          )}
                          {v.kind === 'heritage_site' && v.heritage_site_id != null && (
                            <Link href={`${VENUE_KIND_HREF[v.kind]}/${v.heritage_site_id}`} className="text-on-primary-fixed-variant hover:underline" style={{ fontSize: '11px' }}>↗</Link>
                          )}
                        </div>
                        {v.role && <p className="text-on-surface-variant mt-0.5" style={{ fontSize: '12px' }}>{v.role}</p>}
                        {v.notes && <p className="text-outline mt-0.5" style={{ fontSize: '11px' }}>{v.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Highlights</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {highlights.length === 0 ? 'No highlights recorded yet' : `${highlights.length} ordered item${highlights.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {highlights.length === 0 ? (
                <EmptyRow message="Add rows to content.festival_highlight, ordered by sequence." />
              ) : (
                <ol className="divide-y divide-outline-variant">
                  {highlights.map(h => (
                    <li key={h.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="font-mono text-outline w-5 text-right" style={{ fontSize: '12px' }}>{h.sequence}.</span>
                      <Star size={13} className="text-on-tertiary-container flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>
                          {h.title_en}
                          {h.day_of_festival ? (
                            <span className="ml-2 px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#ede8dd', color: '#424844', fontSize: '10px' }}>
                              Day {h.day_of_festival}
                            </span>
                          ) : null}
                        </p>
                        {h.title_dz && <p className="text-outline" style={{ fontSize: '11px' }}>{h.title_dz}</p>}
                        {h.description && <p className="text-on-surface-variant mt-0.5" style={{ fontSize: '12px' }}>{h.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5 space-y-4">
          {/* Thangka displays */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Thangka displays</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {thangkaDisplays.length === 0 ? 'No thangkas linked yet' : `${thangkaDisplays.length} unfurl${thangkaDisplays.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {thangkaDisplays.length === 0 ? (
                <EmptyRow message="Add rows to content.festival_thangka_display." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {thangkaDisplays.map(d => (
                    <li key={d.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <ScrollText size={13} className="text-on-tertiary-container flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>
                            {d.thangka_name}
                            {d.is_thongdrol ? (
                              <span className="ml-2 px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '9px' }}>
                                Thongdrol
                              </span>
                            ) : null}
                          </p>
                          <p className="text-outline" style={{ fontSize: '11px' }}>
                            {THANGKA_STYLE_LABEL[d.thangka_style] ?? d.thangka_style}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-on-surface-variant flex-wrap" style={{ fontSize: '11px' }}>
                            {d.day_of_festival ? <span>Day {d.day_of_festival}</span> : null}
                            {d.time_of_day ? <span className="font-mono">{d.time_of_day}</span> : null}
                            {d.display_duration_min ? <span>{d.display_duration_min} min</span> : null}
                          </div>
                          {d.notes && <p className="text-outline mt-1" style={{ fontSize: '11px' }}>{d.notes}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Figures */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Figures venerated / depicted</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {figures.length === 0 ? 'No figures linked yet' : `${figures.length} historical figure${figures.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {figures.length === 0 ? (
                <EmptyRow message="Add rows to content.festival_figure." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {figures.map(f => (
                    <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                      <Users size={13} className="text-on-primary-fixed-variant flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>{f.figure_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-outline" style={{ fontSize: '11px' }}>
                          {f.role && <span className="px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant">{f.role}</span>}
                          {f.figure_period && <span>{f.figure_period}</span>}
                        </div>
                        {f.notes && <p className="text-outline mt-0.5" style={{ fontSize: '11px' }}>{f.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Visitor tips */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Visitor tips</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {tips.length === 0 ? 'No tips recorded yet' : `${tips.length} tip${tips.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {tips.length === 0 ? (
                <EmptyRow message="Add rows to content.festival_visitor_tip." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {tips.map(t => (
                    <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                      <Tag size={12} className="text-on-primary-fixed-variant flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        {t.category && (
                          <span className="px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant uppercase font-bold tracking-wider" style={{ fontSize: '9px' }}>
                            {t.category}
                          </span>
                        )}
                        <p className="text-on-surface mt-1" style={{ fontSize: '13px' }}>{t.tip_en}</p>
                        {t.tip_dz && <p className="text-outline" style={{ fontSize: '11px' }}>{t.tip_dz}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-6 text-center text-outline" style={{ fontSize: '12px' }}>
      {message}
    </div>
  );
}

function FeesDisplay({ fees }: { fees: FestivalFee[] | null }) {
  if (!fees || fees.length === 0) {
    return (
      <F label="Fees" hint="Read-only — structured editor coming soon.">
        <div className="rounded border border-dashed border-outline-variant px-3 py-2 text-outline" style={{ fontSize: '12px' }}>
          No fees recorded
        </div>
      </F>
    );
  }
  return (
    <F label="Fees" hint="Read-only — structured editor coming soon.">
      <div className="rounded border border-outline-variant bg-surface-container divide-y divide-outline-variant">
        {fees.map((f, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-1.5" style={{ fontSize: '12px' }}>
            <span className="text-on-surface-variant capitalize">{f.audience ?? 'visitor'}</span>
            <span className="font-mono text-on-surface">
              {f.amount != null ? `${f.amount.toLocaleString()} ${f.currency ?? ''}`.trim() : '—'}
            </span>
          </div>
        ))}
      </div>
    </F>
  );
}

function AgendaDisplay({ agenda }: { agenda: FestivalAgendaItem[] | null }) {
  if (!agenda || agenda.length === 0) {
    return (
      <F label="Day-by-day agenda" hint="Read-only — structured editor coming soon.">
        <div className="rounded border border-dashed border-outline-variant px-3 py-2 text-outline" style={{ fontSize: '12px' }}>
          No agenda outlined
        </div>
      </F>
    );
  }
  return (
    <F label="Day-by-day agenda" hint="Read-only — structured editor coming soon.">
      <div className="rounded border border-outline-variant bg-surface-container divide-y divide-outline-variant">
        {agenda.map((d, i) => (
          <div key={i} className="px-3 py-2" style={{ fontSize: '12px' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-on-primary-fixed-variant uppercase tracking-wide" style={{ fontSize: '10px' }}>
                {d.day != null ? `Day ${d.day}` : 'Day ?'}
              </span>
            </div>
            {(d.items ?? []).map((it, j) => (
              <p key={j} className="text-on-surface-variant ml-1">• {it}</p>
            ))}
            {d.notes && <p className="text-outline italic ml-1 mt-0.5" style={{ fontSize: '11px' }}>{d.notes}</p>}
          </div>
        ))}
      </div>
    </F>
  );
}
