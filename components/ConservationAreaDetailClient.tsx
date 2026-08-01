'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import type {
  ConservationAreaRow,
  CorridorLinkRow,
  ManagementZone,
  PaType,
  IucnCategory,
  ManagementZoneKind,
  MediaEntityType,
  MediaItem,
} from '@/lib/db';
import { updateConservationArea, setConservationAreaStatus, deleteConservationArea } from '@/lib/actions/conservation-areas';
import PolygonGeomEditor from '@/components/map/PolygonGeomEditor';
import type { GeomGeoJSON } from '@/components/map/MapView';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
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

const PA_TYPE_OPTS: { value: PaType; label: string }[] = [
  { value: 'national_park',          label: 'National park' },
  { value: 'wildlife_sanctuary',     label: 'Wildlife sanctuary' },
  { value: 'strict_nature_reserve',  label: 'Strict nature reserve' },
  { value: 'biological_corridor',    label: 'Biological corridor' },
  { value: 'ramsar_site',            label: 'Ramsar site' },
  { value: 'royal_botanical_park',   label: 'Royal botanical park' },
  { value: 'nature_reserve',         label: 'Nature reserve' },
  { value: 'other',                  label: 'Other' },
];

const IUCN_OPTS: { value: IucnCategory; label: string }[] = [
  { value: 'Ia',           label: 'Ia · strict nature reserve' },
  { value: 'Ib',           label: 'Ib · wilderness area' },
  { value: 'II',           label: 'II · national park' },
  { value: 'III',          label: 'III · natural monument' },
  { value: 'IV',           label: 'IV · habitat/species management' },
  { value: 'V',            label: 'V · protected landscape' },
  { value: 'VI',           label: 'VI · sustainable use' },
  { value: 'not_assigned', label: 'Not assigned' },
];

const ACCESS_OPTS = [
  { value: 'open',       label: 'Open' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'closed',     label: 'Closed' },
  { value: 'unknown',    label: 'Unknown' },
] as const;

const ZONE_KIND_LABEL: Record<ManagementZoneKind, string> = {
  core:          'Core',
  buffer:        'Buffer',
  multi_use:     'Multi-use',
  restoration:   'Restoration',
  community_use: 'Community use',
  other:         'Other',
};

const ZONE_KIND_BADGE: Record<ManagementZoneKind, { bg: string; color: string }> = {
  core:          { bg: '#c9ead6', color: '#1a4d2a' },
  buffer:        { bg: '#fdefd8', color: '#7a4a10' },
  multi_use:     { bg: '#d6e8f0', color: '#2c5a70' },
  restoration:   { bg: '#dae69f', color: '#5d682e' },
  community_use: { bg: '#e6dff0', color: '#4a3370' },
  other:         { bg: '#e8e2d7', color: '#727973' },
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

export default function ConservationAreaDetailClient({
  area,
  outgoingLinks,
  incomingLinks,
  zones,
  backHref,
  backLabel,
  initialGeom,
  entityType,
  media,
}: {
  area: ConservationAreaRow;
  outgoingLinks: CorridorLinkRow[];   // populated when area is a corridor
  incomingLinks: CorridorLinkRow[];   // populated when area is a PA touched by corridors
  zones: ManagementZone[];
  backHref: string;
  backLabel: string;
  initialGeom: GeomGeoJSON | null;
  entityType: MediaEntityType;
  media: MediaItem[];
}) {
  const [data, setData] = useState({ ...area });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(area.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(area.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof ConservationAreaRow>(key: K, value: ConservationAreaRow[K]) => {
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
      slug:                data.slug,
      code:                data.code,
      pa_name:             data.pa_name,
      name_en:             data.name_en,
      name_dz:             data.name_dz,
      description:         data.description,
      key_species_notes:   data.key_species_notes,
      pa_type:             data.pa_type,
      iucn_category:       data.iucn_category,
      managing_authority:  data.managing_authority,
      established_year:    data.established_year,
      is_active:           data.is_active,
      area_km2:            data.area_km2,
      area_ha:             data.area_ha,
      permit_required:     data.permit_required,
      permit_info:         data.permit_info,
      access_status:       data.access_status,
      visitor_regulations: data.visitor_regulations,
    };
    startTransition(async () => {
      const res = await updateConservationArea(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name_en}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        const first = Object.entries(res.errors)[0];
        toast.error(first ? `${first[0]}: ${first[1]}` : (res.message ?? 'Please fix the highlighted fields'));
      } else if (res.conflict) {
        toast.error(res.message ?? 'Reload — someone else edited this row');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setConservationAreaStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const isCorridor = data.pa_type === 'biological_corridor';
  const paTypeLabel = PA_TYPE_OPTS.find(o => o.value === data.pa_type)?.label ?? data.pa_type;

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <Link href={backHref} className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> {backLabel}
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded font-bold uppercase border border-outline-variant text-on-surface-variant" style={{ fontSize: '10px' }}>{paTypeLabel}</span>
              {data.iucn_category !== 'not_assigned' && (
                <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#082619', color: '#ffdea3', fontSize: '10px' }}>IUCN {data.iucn_category}</span>
              )}
              {!data.is_active && (
                <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#e8d6d6', color: '#7a1a1a', fontSize: '10px' }}>Inactive</span>
              )}
              {data.permit_required ? (
                <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '10px' }}>Permit required</span>
              ) : null}
              {data.code && <span className="font-mono text-on-primary-fixed-variant text-sm border border-outline-variant px-2 py-0.5 rounded font-bold">{data.code}</span>}
              <span className="font-mono text-outline text-sm border border-outline-variant px-2 py-0.5 rounded">CA-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {data.name_dz && <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>{data.name_dz}</p>}
            {data.pa_name && data.pa_name !== data.name_en && <p className="text-outline mt-0.5" style={{ fontSize: '12px' }}>Source name: {data.pa_name}</p>}
            <div className="flex items-center gap-3 mt-1 flex-wrap text-on-surface-variant" style={{ fontSize: '14px' }}>
              {data.area_km2 != null && <span>{data.area_km2.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²</span>}
              {data.area_m2 != null && (
                <>
                  <span className="text-outline-variant">·</span>
                  <span className="text-outline" style={{ fontSize: '12px' }}>geom {(data.area_m2 / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km²</span>
                </>
              )}
              {data.established_year && (<><span className="text-outline-variant">·</span><span>Est. {data.established_year}</span></>)}
              {data.managing_authority && (<><span className="text-outline-variant">·</span><span>{data.managing_authority}</span></>)}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons
              dirty={dirty}
              pending={pending}
              onDiscard={() => { setData({ ...area }); setDirty(false); }}
              onSave={handleSave}
            />
            <DeleteButton onDelete={() => deleteConservationArea(data.id)}
              redirectTo={backHref} entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <CardHeader className="pb-3">
          <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Boundary geometry</CardTitle>
        </CardHeader>
        <CardContent>
          <PolygonGeomEditor entity="conservation_area" id={area.id} initial={initialGeom} />
        </CardContent>
      </Card>

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
                    <Input value={data.name_en} onChange={e => update('name_en', e.target.value)} className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.name_en} />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Code" hint="e.g. JKSNR, JDNP, BC1">
                      <Input value={data.code ?? ''} onChange={e => update('code', e.target.value || null)} className="border-outline-variant h-9 text-sm font-mono" />
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Slug">
                      <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-outline-variant h-9 text-sm font-mono" />
                      <FieldError message={errors.slug} />
                    </F>
                    <F label="Source name (as shipped)" hint="From the source dataset.">
                      <Input value={data.pa_name ?? ''} onChange={e => update('pa_name', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                </div>
              </div>

              <div>
                <S title="Classification" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="PA type">
                      <Select value={data.pa_type} onValueChange={v => { if (v) update('pa_type', v as PaType); }}>
                        <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PA_TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="IUCN category">
                      <Select value={data.iucn_category} onValueChange={v => { if (v) update('iucn_category', v as IucnCategory); }}>
                        <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {IUCN_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Managing authority">
                      <Input value={data.managing_authority ?? ''} onChange={e => update('managing_authority', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Established year">
                      <Input type="number" min={1800} max={new Date().getFullYear()} value={data.established_year ?? ''}
                        onChange={e => update('established_year', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.established_year} />
                    </F>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-on-surface-variant">Active</Label>
                    <Switch checked={!!data.is_active} onCheckedChange={v => update('is_active', v ? 1 : 0)}
                      className="data-[state=checked]:bg-on-primary-fixed-variant" />
                  </div>
                </div>
              </div>

              <div>
                <S title="Narrative" />
                <div className="space-y-3">
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={5} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Key species notes" hint="Free text — structured species links live in content.species_location.">
                    <Textarea value={data.key_species_notes ?? ''} onChange={e => update('key_species_notes', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management zones */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Management zones</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {zones.length === 0 ? 'No zones recorded' : `${zones.length} zone${zones.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {zones.length === 0 ? (
                <div className="px-5 py-6 text-center text-outline" style={{ fontSize: '12px' }}>
                  Populate content.management_zone to break this area into core / buffer / multi-use sub-polygons.
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {zones.map(z => {
                    const b = ZONE_KIND_BADGE[z.kind];
                    return (
                      <li key={z.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: b.bg, color: b.color, fontSize: '9px' }}>
                            {ZONE_KIND_LABEL[z.kind]}
                          </span>
                          {z.name && <span className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>{z.name}</span>}
                          {z.area_m2 != null && (
                            <span className="font-mono text-outline" style={{ fontSize: '11px' }}>
                              {(z.area_m2 / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km²
                            </span>
                          )}
                        </div>
                        {z.description && <p className="text-on-surface-variant mt-1" style={{ fontSize: '12px' }}>{z.description}</p>}
                        {z.regulations && <p className="text-outline mt-1 italic" style={{ fontSize: '11px' }}>{z.regulations}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Corridor links */}
          {(isCorridor || incomingLinks.length > 0) && (
            <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>
                  {isCorridor ? 'Connects to' : 'Reached by corridors'}
                </CardTitle>
                <p className="text-outline" style={{ fontSize: '12px' }}>
                  {isCorridor
                    ? (outgoingLinks.length === 0 ? 'No outbound PA links yet' : `${outgoingLinks.length} protected area${outgoingLinks.length === 1 ? '' : 's'}`)
                    : `${incomingLinks.length} corridor${incomingLinks.length === 1 ? '' : 's'}`}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {(isCorridor ? outgoingLinks : incomingLinks).length === 0 ? (
                  <div className="px-5 py-6 text-center text-outline" style={{ fontSize: '12px' }}>
                    Populate content.corridor_link to record connectivity.
                  </div>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {(isCorridor ? outgoingLinks : incomingLinks).map(l => {
                      const targetHref = l.pa_type === 'biological_corridor'
                        ? `/corridors/${l.pa_id}`
                        : `/conservation/${l.pa_id}`;
                      return (
                        <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                          <MapPin size={14} className="text-on-primary-fixed-variant flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {l.pa_code && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: '#082619', color: '#ffdea3', fontSize: '10px' }}>
                                  {l.pa_code}
                                </span>
                              )}
                              <Link href={targetHref} className="font-semibold text-on-primary-fixed-variant hover:underline" style={{ fontSize: '13px' }}>
                                {l.pa_name}
                              </Link>
                              {l.role && (
                                <span className="px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant uppercase" style={{ fontSize: '9px' }}>{l.role}</span>
                              )}
                            </div>
                            {l.notes && <p className="text-outline mt-1 italic" style={{ fontSize: '11px' }}>{l.notes}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="col-span-5 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Visitor &amp; area</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <F label="Access status">
                <Select value={data.access_status} onValueChange={v => { if (v) update('access_status', v as ConservationAreaRow['access_status']); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-on-surface-variant">Permit required</Label>
                <Switch checked={!!data.permit_required} onCheckedChange={v => update('permit_required', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              {data.permit_required ? (
                <F label="Permit info">
                  <Textarea value={data.permit_info ?? ''} onChange={e => update('permit_info', e.target.value || null)}
                    rows={3} className="border-outline-variant text-sm resize-none" />
                </F>
              ) : null}
              <F label="Visitor regulations">
                <Textarea value={data.visitor_regulations ?? ''} onChange={e => update('visitor_regulations', e.target.value || null)}
                  rows={4} className="border-outline-variant text-sm resize-none"
                  placeholder="Restrictions, no-go zones, seasonal closures…" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Area (km²)" hint="Editor-curated; may differ from geodesic value.">
                  <Input type="number" step="0.01" min={0} value={data.area_km2 ?? ''}
                    onChange={e => update('area_km2', e.target.value ? Number(e.target.value) : null)}
                    className="border-outline-variant h-9 text-sm" />
                  <FieldError message={errors.area_km2} />
                </F>
                <F label="Area (ha)">
                  <Input type="number" step="0.01" min={0} value={data.area_ha ?? ''}
                    onChange={e => update('area_ha', e.target.value ? Number(e.target.value) : null)}
                    className="border-outline-variant h-9 text-sm" />
                  <FieldError message={errors.area_ha} />
                </F>
              </div>
              {data.area_m2 != null && (
                <p className="text-outline italic" style={{ fontSize: '11px' }}>
                  Geodesic (loader-computed) area: {(data.area_m2 / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km² · read-only
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityMediaPanel
                entityType={entityType}
                entityId={data.id}
                items={media}
                revalidatePaths={[`${backHref}/${data.id}`, '/media']}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
