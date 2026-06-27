'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Stethoscope, Plane, Truck } from 'lucide-react';
import { toast } from 'sonner';

import type { HealthCenterFull, RefOption, RefHealthCenterType } from '@/lib/db';
import {
  updateHealthCenter, setHealthCenterStatus, deleteHealthCenter,
} from '@/lib/actions/health-centers';
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

const STATUS_OPTS = [
  { value: 'operational',          label: 'Operational' },
  { value: 'temporarily_closed',   label: 'Temporarily closed' },
  { value: 'under_construction',   label: 'Under construction' },
  { value: 'permanently_closed',   label: 'Permanently closed' },
  { value: 'unknown',              label: 'Unknown' },
];

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

export default function HealthCenterDetailClient({
  hc, districts, types, initialGeom,
}: { hc: HealthCenterFull; districts: RefOption[]; types: RefHealthCenterType[]; initialGeom: GeomGeoJSON | null }) {
  const [data, setData] = useState({ ...hc });
  const selectedType = types.find(t => t.id === data.type_id);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(hc.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(hc.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof HealthCenterFull>(key: K, value: HealthCenterFull[K]) => {
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
      name_en:                data.name_en,
      name_dz:                data.name_dz,
      name_old:               data.name_old,
      description:            data.description,
      remarks:                data.remarks,
      type_id:                data.type_id,
      status:                 data.status,
      beds:                   data.beds,
      year_established:       data.year_established,
      elevation_m:            data.elevation_m,
      dzongkhag_id:           data.dzongkhag_id,
      has_helipad:            data.has_helipad,
      requires_4wd_access:    data.requires_4wd_access,
      nearest_road_access_km: data.nearest_road_access_km,
    };
    startTransition(async () => {
      const res = await updateHealthCenter(data.id, patch, updatedAt ?? undefined);
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
      const res = await setHealthCenterStatus(data.id, next, updatedAt ?? undefined);
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
        <Link href="/health-centers"
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Health Centers
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                <Stethoscope size={11} /> {selectedType?.full_form ?? selectedType?.label_en ?? data.type}
              </span>
              {data.has_helipad ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <Plane size={11} /> Helipad
                </span>
              ) : null}
              {data.requires_4wd_access ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <Truck size={11} /> 4WD only
                </span>
              ) : null}
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>HC-{data.id}</span>
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {data.name_dz && (
              <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>{data.name_dz}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...hc }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteHealthCenter(data.id)}
              redirectTo="/health-centers" entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <CardContent className="p-5">
          <S title="Location" />
          <PointGeomEditor entity="health_center" id={data.id} initial={initialGeom} />
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
                    <F label="Former name" hint="Legacy / matching aid.">
                      <Input value={data.name_old ?? ''} onChange={e => update('name_old', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Remarks">
                    <Textarea value={data.remarks ?? ''} onChange={e => update('remarks', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Capacity" />
                <div className="grid grid-cols-3 gap-3">
                  <F label="Beds">
                    <Input type="number" value={data.beds ?? ''}
                      onChange={e => update('beds', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Year established">
                    <Input type="number" value={data.year_established ?? ''}
                      onChange={e => update('year_established', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Nearest road (km)">
                    <Input type="number" step="0.1" value={data.nearest_road_access_km ?? ''}
                      onChange={e => update('nearest_road_access_km', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Classification" />
              <F label="Type" hint={selectedType?.description ?? undefined}>
                <Select value={String(data.type_id)} onValueChange={(v) => { if (v) update('type_id', Number(v)); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.full_form ? `${t.label_en} — ${t.full_form}` : t.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.type_id} />
              </F>
              <F label="Operational status">
                <Select value={data.status} onValueChange={(v) => { if (v) update('status', v); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Access" />
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Helipad available</Label>
                <Switch checked={!!data.has_helipad}
                  onCheckedChange={v => update('has_helipad', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Requires 4WD access</Label>
                <Switch checked={!!data.requires_4wd_access}
                  onCheckedChange={v => update('requires_4wd_access', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Location" />
              <div className="grid grid-cols-2 gap-3">
                <F label="Longitude">
                  <Input type="number" step="0.0001" value={data.lon ?? ''}
                    readOnly className="border-outline-variant h-9 text-sm font-mono bg-surface-container" />
                </F>
                <F label="Latitude">
                  <Input type="number" step="0.0001" value={data.lat ?? ''}
                    readOnly className="border-outline-variant h-9 text-sm font-mono bg-surface-container" />
                </F>
              </div>
              <F label="Elevation (m)">
                <Input type="number" value={data.elevation_m ?? ''}
                  onChange={e => update('elevation_m', e.target.value ? Number(e.target.value) : null)}
                  className="border-outline-variant h-9 text-sm font-mono" />
              </F>
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
        </div>
      </div>
    </div>
  );
}
