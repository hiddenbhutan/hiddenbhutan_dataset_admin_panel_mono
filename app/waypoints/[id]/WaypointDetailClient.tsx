'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import type { WaypointFull, RefWaypointType, RefOption, MediaItem } from '@/lib/db';
import {
  updateWaypoint, setWaypointStatus, deleteWaypoint,
} from '@/lib/actions/waypoints';
import PointGeomEditor from '@/components/map/PointGeomEditor';
import type { GeomGeoJSON } from '@/components/map/MapView';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import {
  StatusBadge, StatusActions, DiscardSaveButtons, DeleteButton, FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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

export default function WaypointDetailClient({
  waypoint, types, districts, initialGeom, media,
}: {
  waypoint: WaypointFull;
  types: RefWaypointType[];
  districts: RefOption[];
  initialGeom: GeomGeoJSON | null;
  media: MediaItem[];
}) {
  const [data, setData] = useState({ ...waypoint });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(waypoint.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(waypoint.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof WaypointFull>(key: K, value: WaypointFull[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    setDirty(true);
  }, []);

  function handleSave() {
    // lon/lat are saved directly by the PointGeomEditor; this patch only carries scalar fields.
    const patch = {
      name_en:          data.name_en,
      name_dz:          data.name_dz,
      description:      data.description,
      remarks:          data.remarks,
      waypoint_type_id: data.waypoint_type_id,
      elevation_m:      data.elevation_m,
      dzongkhag_id:     data.dzongkhag_id,
      is_visible:       data.is_visible,
    };
    startTransition(async () => {
      const res = await updateWaypoint(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name_en ?? 'waypoint'}`);
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
      const res = await setWaypointStatus(data.id, next, updatedAt ?? undefined);
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
        <Link href="/waypoints"
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Waypoints
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                <MapPin size={11} /> {data.waypoint_type_label ?? 'Waypoint'}
              </span>
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>WP-{data.id}</span>
              {data.route_count > 0 && (
                <span className="text-outline" style={{ fontSize: '11px' }}>· Used in {data.route_count} route{data.route_count === 1 ? '' : 's'}</span>
              )}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en ?? `Waypoint ${data.id}`}</h1>
            {data.name_dz && (
              <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>{data.name_dz}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...waypoint }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteWaypoint(data.id)}
              redirectTo="/waypoints" entityLabel={data.name_en ?? `waypoint ${data.id}`} />
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
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en ?? ''} onChange={e => update('name_en', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.name_en} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Remarks" hint="Internal notes; not displayed to end-users.">
                    <Textarea value={data.remarks ?? ''} onChange={e => update('remarks', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Location" />
                <div className="space-y-3">
                  <PointGeomEditor
                    entity="waypoint"
                    id={data.id}
                    initial={initialGeom}
                    onSaved={(g) => {
                      if (g.type === 'Point') {
                        setData(prev => ({ ...prev, lon: g.coordinates[0], lat: g.coordinates[1] }));
                      }
                    }}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Longitude" hint="Decimal degrees (WGS84)">
                      <Input type="number" step="0.0001" value={data.lon ?? ''}
                        readOnly className="border-outline-variant h-9 text-sm font-mono bg-surface-container" />
                    </F>
                    <F label="Latitude" hint="Decimal degrees (WGS84)">
                      <Input type="number" step="0.0001" value={data.lat ?? ''}
                        readOnly className="border-outline-variant h-9 text-sm font-mono bg-surface-container" />
                    </F>
                    <F label="Elevation (m)">
                      <Input type="number" value={data.elevation_m ?? ''}
                        onChange={e => update('elevation_m', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm font-mono" />
                    </F>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityMediaPanel
                entityType="waypoint"
                entityId={waypoint.id}
                items={media}
                revalidatePaths={[`/waypoints/${waypoint.id}`, '/media']}
              />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Type" />
              <F label="Waypoint type">
                <Select value={data.waypoint_type_id ? String(data.waypoint_type_id) : ''}
                  onValueChange={(v) => update('waypoint_type_id', v ? Number(v) : null)}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.label_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.waypoint_type_id} />
              </F>
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Visible in app</Label>
                <Switch checked={!!data.is_visible}
                  onCheckedChange={v => update('is_visible', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Administrative" />
              <F label="Dzongkhag (district)">
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
              <p className="text-outline" style={{ fontSize: '11px' }}>
                Gewog + chiwog are derived automatically from coordinates by the loader pipeline.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
