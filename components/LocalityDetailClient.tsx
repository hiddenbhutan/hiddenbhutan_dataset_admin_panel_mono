'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import type { LocalityFull, RefOption } from '@/lib/db';
import {
  updateLocality, setLocalityStatus, deleteLocality,
} from '@/lib/actions/villages';
import PointGeomEditor from '@/components/map/PointGeomEditor';
import type { GeomGeoJSON } from '@/components/map/MapView';
import {
  StatusBadge, StatusActions, DiscardSaveButtons, DeleteButton, FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const LOCALITY_KINDS: Array<{ value: string; label: string; group: string }> = [
  { value: 'village',          label: 'Village',          group: 'Settlements' },
  { value: 'hamlet',           label: 'Hamlet',           group: 'Settlements' },
  { value: 'settlement',       label: 'Settlement',       group: 'Settlements' },
  { value: 'town',             label: 'Town',             group: 'Settlements' },
  { value: 'thromde',          label: 'Thromde',          group: 'Settlements' },
  { value: 'peak',             label: 'Peak',             group: 'Topography' },
  { value: 'pass',             label: 'Pass',             group: 'Topography' },
  { value: 'ridge',            label: 'Ridge',            group: 'Topography' },
  { value: 'valley',           label: 'Valley',           group: 'Topography' },
  { value: 'meadow',           label: 'Meadow',           group: 'Topography' },
  { value: 'glacier',          label: 'Glacier',          group: 'Topography' },
  { value: 'lake',             label: 'Lake',             group: 'Water' },
  { value: 'river',            label: 'River',            group: 'Water' },
  { value: 'river_confluence', label: 'River confluence', group: 'Water' },
  { value: 'waterfall',        label: 'Waterfall',        group: 'Water' },
  { value: 'spring',           label: 'Spring',           group: 'Water' },
  { value: 'cave',             label: 'Cave',             group: 'Landmarks' },
  { value: 'cliff',             label: 'Cliff',            group: 'Landmarks' },
  { value: 'sacred_site',      label: 'Sacred site',      group: 'Landmarks' },
  { value: 'landmark',         label: 'Landmark',         group: 'Landmarks' },
  { value: 'other',            label: 'Other',            group: 'Landmarks' },
];

const SETTLEMENT_KINDS = new Set(['village', 'hamlet', 'settlement', 'town', 'thromde']);

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

type TriBoolValue = '__null' | '__yes' | '__no';
function triBoolFor(v: boolean | null): TriBoolValue {
  if (v === null) return '__null';
  return v ? '__yes' : '__no';
}
function triBoolValue(v: TriBoolValue): boolean | null {
  if (v === '__yes') return true;
  if (v === '__no')  return false;
  return null;
}

function TriBoolSelect({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <Select value={triBoolFor(value)} onValueChange={(v) => onChange(triBoolValue(v as TriBoolValue))}>
      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__null">Unknown</SelectItem>
        <SelectItem value="__yes">Yes</SelectItem>
        <SelectItem value="__no">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function LocalityDetailClient({
  locality, districts, backHref, backLabel, initialGeom,
}: {
  locality: LocalityFull;
  districts: RefOption[];
  backHref: string;
  backLabel: string;
  initialGeom: GeomGeoJSON | null;
}) {
  const [data, setData] = useState({ ...locality });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(locality.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(locality.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof LocalityFull>(key: K, value: LocalityFull[K]) => {
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
      name_en:             data.name_en,
      name_dz:             data.name_dz,
      name_romanized:      data.name_romanized,
      name_meaning:        data.name_meaning,
      kind:                data.kind,
      source_feature_type: data.source_feature_type,
      description:         data.description,
      elevation_m:         data.elevation_m,
      dzongkhag_id:        data.dzongkhag_id,
      population_male:     data.population_male,
      population_female:   data.population_female,
      population_total:    data.population_total,
      population_year:     data.population_year,
      has_accommodation:   data.has_accommodation,
      accommodation_notes: data.accommodation_notes,
      has_food_supply:     data.has_food_supply,
      has_phone_signal:    data.has_phone_signal,
    };
    startTransition(async () => {
      const res = await updateLocality(data.id, patch, updatedAt ?? undefined);
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
      const res = await setLocalityStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const isSettlement = SETTLEMENT_KINDS.has(data.kind);
  const currentKind = LOCALITY_KINDS.find(k => k.value === data.kind);

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href={backHref}
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> {backLabel}
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                <MapPin size={11} /> {currentKind?.label ?? data.kind}
              </span>
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>L-{data.id}</span>
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
              onDiscard={() => { setData({ ...locality }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteLocality(data.id)}
              redirectTo={backHref} entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <CardContent className="p-5">
          <S title="Location" />
          <PointGeomEditor entity="locality" id={data.id} initial={initialGeom} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en} onChange={e => update('name_en', e.target.value)}
                        className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.name_en} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm italic" />
                    </F>
                  </div>
                  <F label="Name meaning / etymology">
                    <Textarea value={data.name_meaning ?? ''} onChange={e => update('name_meaning', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Location" />
                <div className="grid grid-cols-3 gap-3">
                  <F label="Longitude">
                    <Input type="number" step="0.0001" value={data.lon ?? ''}
                      onChange={e => update('lon', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Latitude">
                    <Input type="number" step="0.0001" value={data.lat ?? ''}
                      onChange={e => update('lat', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Elevation (m)">
                    <Input type="number" value={data.elevation_m ?? ''}
                      onChange={e => update('elevation_m', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                </div>
                <p className="text-outline mt-2" style={{ fontSize: '11px' }}>
                  Updating lon/lat in this editor is read-only — coordinates come from the loader pipeline. Use a GIS tool to relocate.
                </p>
              </div>

              {isSettlement && (
                <div>
                  <S title="Settlement enrichment" />
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <F label="Total population">
                        <Input type="number" value={data.population_total ?? ''}
                          onChange={e => update('population_total', e.target.value ? Number(e.target.value) : null)}
                          className="border-outline-variant h-9 text-sm font-mono" />
                      </F>
                      <F label="Male">
                        <Input type="number" value={data.population_male ?? ''}
                          onChange={e => update('population_male', e.target.value ? Number(e.target.value) : null)}
                          className="border-outline-variant h-9 text-sm font-mono" />
                      </F>
                      <F label="Female">
                        <Input type="number" value={data.population_female ?? ''}
                          onChange={e => update('population_female', e.target.value ? Number(e.target.value) : null)}
                          className="border-outline-variant h-9 text-sm font-mono" />
                      </F>
                      <F label="Census year">
                        <Input type="number" value={data.population_year ?? ''}
                          onChange={e => update('population_year', e.target.value ? Number(e.target.value) : null)}
                          className="border-outline-variant h-9 text-sm font-mono" />
                      </F>
                    </div>
                    <F label="Accommodation notes">
                      <Textarea value={data.accommodation_notes ?? ''} onChange={e => update('accommodation_notes', e.target.value || null)}
                        rows={2} className="border-outline-variant text-sm resize-none" />
                    </F>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Classification" />
              <F label="Kind">
                <Select value={data.kind} onValueChange={(v) => update('kind', v as typeof data.kind)}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCALITY_KINDS.map(k => (
                      <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Source feature type" hint="As shipped by the source dataset.">
                <Input value={data.source_feature_type ?? ''} onChange={e => update('source_feature_type', e.target.value || null)}
                  className="border-outline-variant h-9 text-sm" />
              </F>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Administrative" />
              <F label="Dzongkhag">
                <Select value={data.dzongkhag_id ? String(data.dzongkhag_id) : '__none'}
                  onValueChange={(v) => update('dzongkhag_id', v === '__none' ? null : Number(v))}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {districts.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
            </CardContent>
          </Card>

          {isSettlement && (
            <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <S title="Trekker amenities" />
                <F label="Accommodation">
                  <TriBoolSelect value={data.has_accommodation} onChange={(v) => update('has_accommodation', v)} />
                </F>
                <F label="Food supply">
                  <TriBoolSelect value={data.has_food_supply} onChange={(v) => update('has_food_supply', v)} />
                </F>
                <F label="Phone signal">
                  <TriBoolSelect value={data.has_phone_signal} onChange={(v) => update('has_phone_signal', v)} />
                </F>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
