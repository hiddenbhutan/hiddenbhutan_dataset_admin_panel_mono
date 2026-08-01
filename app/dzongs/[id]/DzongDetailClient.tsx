'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mountain, Users, Landmark } from 'lucide-react';
import { toast } from 'sonner';

import type {
  Dzong,
  DzongLhakhang,
  RefOption,
  HeritageFee,
  HeritageOpeningHours,
  MediaItem,
} from '@/lib/db';
import { updateDzong, setDzongStatus, deleteDzong } from '@/lib/actions/dzongs';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import PointGeomEditor from '@/components/map/PointGeomEditor';
import type { GeomGeoJSON } from '@/components/map/MapView';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

const TYPE_OPTS: { value: NonNullable<Dzong['type']>; label: string }[] = [
  { value: 'administrative_dzong', label: 'Administrative dzong' },
  { value: 'monastic_dzong',       label: 'Monastic dzong' },
  { value: 'ta_dzong',             label: 'Ta dzong (watchtower)' },
  { value: 'historical_dzong',     label: 'Historical / ruined dzong' },
  { value: 'other',                label: 'Other' },
];

const CONS_OPTIONS = [
  { value: 'registered_protected',   label: 'Registered + protected' },
  { value: 'registered_unprotected', label: 'Registered (unprotected)' },
  { value: 'unregistered',           label: 'Unregistered' },
  { value: 'restored',               label: 'Restored' },
  { value: 'ruins',                  label: 'Ruins' },
  { value: 'lost',                   label: 'Lost' },
  { value: 'unknown',                label: 'Unknown' },
] as const;

const ACCESS_OPTIONS = [
  { value: 'open',       label: 'Open' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'closed',     label: 'Closed' },
  { value: 'unknown',    label: 'Unknown' },
] as const;

const DAY_ORDER: Array<keyof Omit<HeritageOpeningHours, 'notes'>> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

export default function DzongDetailClient({
  dzong,
  lhakhangs,
  periods,
  figures,
  initialGeom,
  media,
}: {
  dzong: Dzong;
  lhakhangs: DzongLhakhang[];
  periods: RefOption[];
  figures: RefOption[];
  initialGeom: GeomGeoJSON | null;
  media: MediaItem[];
}) {
  const [data, setData] = useState({ ...dzong });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(dzong.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(dzong.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof Dzong>(key: K, value: Dzong[K]) => {
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
      name:                  data.name,
      name_dz:               data.name_dz,
      name_romanized:        data.name_romanized,
      slug:                  data.slug,
      description:           data.description,
      significance:          data.significance,
      visitor_info:          data.visitor_info,
      type:                  data.type,
      built_year:            data.built_year,
      built_year_approx:     data.built_year_approx,
      period_id:             data.period_id,
      founder_figure_id:     data.founder_figure_id,
      heritage_site_id:      data.heritage_site_id,
      conservation_status:   data.conservation_status,
      access_status:         data.access_status,
      is_current_admin_seat: data.is_current_admin_seat,
      houses_monk_body:      data.houses_monk_body,
      monk_body_capacity:    data.monk_body_capacity,
    };
    startTransition(async () => {
      const res = await updateDzong(data.id, patch, updatedAt ?? undefined);
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
      const res = await setDzongStatus(data.id, next, updatedAt ?? undefined);
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
        <Link href="/dzongs" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Dzongs
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.type && (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase border border-outline-variant text-on-surface-variant" style={{ fontSize: '10px' }}>
                  {TYPE_OPTS.find(o => o.value === data.type)?.label ?? data.type.replace(/_/g, ' ')}
                </span>
              )}
              {data.is_current_admin_seat ? (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '10px' }}>Admin seat</span>
              ) : null}
              {data.houses_monk_body ? (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '10px' }}>Monk body</span>
              ) : null}
              {data.district && <span className="text-outline" style={{ fontSize: '12px' }}>{data.district}</span>}
              <span className="font-mono text-outline text-sm border border-outline-variant px-2 py-0.5 rounded">DZ-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
              {data.name}
            </h1>
            {(data.name_dz || data.name_romanized) && (
              <div className="text-on-surface-variant mt-0.5" style={{ fontSize: '14px' }}>
                {data.name_dz && <span>{data.name_dz}</span>}
                {data.name_dz && data.name_romanized && <span className="text-[#c2c8c2] mx-2">·</span>}
                {data.name_romanized && <span className="italic">{data.name_romanized}</span>}
              </div>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap text-on-surface-variant" style={{ fontSize: '14px' }}>
              {data.elevation_m != null && (
                <span className="flex items-center gap-1"><Mountain size={13} /> {Math.round(data.elevation_m).toLocaleString()} m</span>
              )}
              {data.built_year && (<><span className="text-[#c2c8c2]">·</span><span>Built {data.built_year}</span></>)}
              {!data.built_year && data.built_year_approx && (
                <><span className="text-[#c2c8c2]">·</span><span>~{data.built_year_approx}</span></>
              )}
              {data.period && (<><span className="text-[#c2c8c2]">·</span><span>{data.period}</span></>)}
              {data.monk_body_capacity != null && data.houses_monk_body ? (
                <><span className="text-[#c2c8c2]">·</span><span className="flex items-center gap-1"><Users size={13} /> {data.monk_body_capacity.toLocaleString()} monks</span></>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons
              dirty={dirty}
              pending={pending}
              onDiscard={() => { setData({ ...dzong }); setDirty(false); }}
              onSave={handleSave}
            />
            <DeleteButton onDelete={() => deleteDzong(data.id)}
              redirectTo="/dzongs" entityLabel={data.name} />
          </div>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <CardHeader className="pb-3">
          <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Location</CardTitle>
        </CardHeader>
        <CardContent>
          <PointGeomEditor entity="dzong" id={data.id} initial={initialGeom} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Editorial content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <F label="Name (English)">
                    <Input value={data.name ?? ''} onChange={e => update('name', e.target.value)}
                      className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.name} />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Name (romanized)">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm italic" />
                    </F>
                  </div>
                  <F label="Slug" hint="URL identifier (lowercase, dashes).">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm font-mono" placeholder="e.g. punakha-dzong" />
                    <FieldError message={errors.slug} />
                  </F>
                  <F label="Type">
                    <Select value={data.type ?? '__none'}
                      onValueChange={v => { if (v) update('type', v === '__none' ? null : v as Dzong['type']); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                </div>
              </div>
              <div>
                <S title="History" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Built year">
                      <Input type="number" min={1} max={new Date().getFullYear()}
                        value={data.built_year ?? ''}
                        onChange={e => update('built_year', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.built_year} />
                    </F>
                    <F label="Approx. year" hint="Use when only the century is known.">
                      <Input type="number" min={1} max={new Date().getFullYear()}
                        value={data.built_year_approx ?? ''}
                        onChange={e => update('built_year_approx', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                  <F label="Historical period">
                    <Select value={data.period_id ? String(data.period_id) : '__none'}
                      onValueChange={v => { if (v) update('period_id', v === '__none' ? null : Number(v)); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {periods.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Founder (catalogued figure)">
                    <Select value={data.founder_figure_id ? String(data.founder_figure_id) : '__none'}
                      onValueChange={v => { if (v) update('founder_figure_id', v === '__none' ? null : Number(v)); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {figures.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Significance">
                    <Textarea value={data.significance ?? ''}
                      onChange={e => update('significance', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none"
                      placeholder="Religious / administrative significance…" />
                  </F>
                </div>
              </div>
              <div>
                <S title="Narrative" />
                <F label="Description">
                  <Textarea value={data.description ?? ''}
                    onChange={e => update('description', e.target.value || null)}
                    rows={6} className="border-outline-variant text-sm resize-none"
                    placeholder="Detail page content…" />
                </F>
              </div>
            </CardContent>
          </Card>

          {/* Child lhakhangs */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none mt-4">
            <CardHeader className="pb-3 flex items-center justify-between flex-row">
              <div>
                <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Lhakhangs inside this dzong</CardTitle>
                <p className="text-outline" style={{ fontSize: '12px' }}>
                  {lhakhangs.length === 0 ? 'No child chapels recorded yet' : `${lhakhangs.length} child chapel${lhakhangs.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {lhakhangs.length === 0 ? (
                <div className="px-5 py-8 text-center text-outline" style={{ fontSize: '13px' }}>
                  Add lhakhangs via the database to break out chapels visitors care about (Tshechu Lhakhang, Kuenrey, Machen, …).
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead style={{ backgroundColor: '#ede8dd' }}>
                    <tr className="border-b border-outline-variant">
                      {['#', 'Name', 'Significance', 'Workflow'].map(h => (
                        <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '11px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e2d7]">
                    {lhakhangs.map(l => {
                      const cs = STATUS_BADGE[l.content_status] ?? STATUS_BADGE.draft;
                      return (
                        <tr key={l.id} className="hover:bg-[#f9f3e8]">
                          <td className="px-4 py-2.5 font-mono text-outline" style={{ fontSize: '11px' }}>{l.sort_order || l.id}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>{l.name}</div>
                            {l.name_dz && <div className="text-outline" style={{ fontSize: '11px' }}>{l.name_dz}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-on-surface-variant" style={{ fontSize: '12px', maxWidth: 380 }}>
                            <div className="truncate">{l.significance ?? l.description ?? <span className="text-[#c2c8c2]">—</span>}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none mt-4">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityMediaPanel
                entityType="dzong"
                entityId={dzong.id}
                items={media}
                revalidatePaths={[`/dzongs/${dzong.id}`, '/media']}
              />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Operational + visitor info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <S title="Function" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-on-surface-variant">Current administrative seat</Label>
                    <Switch
                      checked={!!data.is_current_admin_seat}
                      onCheckedChange={v => update('is_current_admin_seat', v ? 1 : 0)}
                      className="data-[state=checked]:bg-on-primary-fixed-variant"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-on-surface-variant">Houses monk body</Label>
                    <Switch
                      checked={!!data.houses_monk_body}
                      onCheckedChange={v => update('houses_monk_body', v ? 1 : 0)}
                      className="data-[state=checked]:bg-on-primary-fixed-variant"
                    />
                  </div>
                  {data.houses_monk_body ? (
                    <F label="Monk body capacity">
                      <Input type="number" min={0} value={data.monk_body_capacity ?? ''}
                        onChange={e => update('monk_body_capacity', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm" placeholder="approx. count" />
                      <FieldError message={errors.monk_body_capacity} />
                    </F>
                  ) : null}
                </div>
              </div>
              <div>
                <S title="Access" />
                <div className="space-y-3">
                  <F label="Conservation status">
                    <Select value={data.conservation_status ?? '__none'}
                      onValueChange={v => { if (v) update('conservation_status', v === '__none' ? null : v as Dzong['conservation_status']); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {CONS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Access status">
                    <Select value={data.access_status ?? '__none'}
                      onValueChange={v => { if (v) update('access_status', v === '__none' ? null : v as Dzong['access_status']); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Unknown" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {ACCESS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                </div>
              </div>
              <div>
                <S title="Visiting" />
                <div className="space-y-3">
                  <F label="Visitor info">
                    <Textarea value={data.visitor_info ?? ''}
                      onChange={e => update('visitor_info', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none"
                      placeholder="Hours, dress code, photography rules…" />
                  </F>
                  <FeesDisplay fees={data.fees} />
                  <OpeningHoursDisplay hours={data.opening_hours} />
                </div>
              </div>
              {data.heritage_site_id && (
                <div className="rounded p-2 border border-outline-variant bg-[#f9f3e8]" style={{ fontSize: '12px' }}>
                  <Landmark className="inline mr-1" size={13} />
                  Linked to canonical{' '}
                  <Link href={`/heritage/${data.heritage_site_id}`} className="text-on-primary-fixed-variant font-semibold hover:underline">
                    heritage_site #{data.heritage_site_id}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeesDisplay({ fees }: { fees: HeritageFee[] | null }) {
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
      <div className="rounded border border-outline-variant bg-surface-container-low divide-y divide-outline-variant">
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

function OpeningHoursDisplay({ hours }: { hours: HeritageOpeningHours | null }) {
  if (!hours) {
    return (
      <F label="Opening hours" hint="Read-only — structured editor coming soon.">
        <div className="rounded border border-dashed border-outline-variant px-3 py-2 text-outline" style={{ fontSize: '12px' }}>
          No hours recorded
        </div>
      </F>
    );
  }
  const dayRows = DAY_ORDER.map(day => ({ day, slots: hours[day] })).filter(r => r.slots && r.slots.length > 0);
  return (
    <F label="Opening hours" hint="Read-only — structured editor coming soon.">
      <div className="rounded border border-outline-variant bg-surface-container-low divide-y divide-outline-variant">
        {dayRows.length === 0 ? (
          <p className="px-3 py-1.5 text-outline" style={{ fontSize: '12px' }}>No daily hours recorded</p>
        ) : (
          dayRows.map(({ day, slots }) => (
            <div key={day} className="flex items-center justify-between px-3 py-1.5" style={{ fontSize: '12px' }}>
              <span className="font-mono text-on-surface-variant w-10">{DAY_LABEL[day as string]}</span>
              <span className="font-mono text-on-surface">
                {(slots ?? []).map((s, i) => `${s.open}–${s.close}${i < (slots!.length - 1) ? ', ' : ''}`).join('')}
              </span>
            </div>
          ))
        )}
        {hours.notes && <p className="px-3 py-1.5 text-outline italic" style={{ fontSize: '11px' }}>{hours.notes}</p>}
      </div>
    </F>
  );
}
