'use client';

import { useState, useCallback, useMemo, useRef, useTransition } from 'react';
import type { TrekRoute, Waypoint, NearbyWaypoint, MediaItem } from '@/lib/db';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import {
  updateTrekRoute,
  setTrekRouteStatus,
  deleteTrekRoute,
  linkWaypointToRoute,
} from '@/lib/actions/trek-routes';
import type { ContentStatus } from '@/components/ContentStatusControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import UnsavedBar from '@/components/UnsavedBar';
import { DeleteButton } from '@/components/ContentStatusControls';
import LineGeomEditor from '@/components/map/LineGeomEditor';
import type { GeomGeoJSON, MapMarker } from '@/components/map/MapView';
import { waypointIcon } from '@/components/map/waypointIcon';
import Link from 'next/link';
import { ArrowLeft, Globe, FileText, Mountain, Ruler, CheckCircle2, Eye, EyeOff, Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

// content.trail_* enum value sets, mirroring the deploy scripts.
const TYPE_OPTS = [
  { value: 'trek',           label: 'Trek' },
  { value: 'hike',           label: 'Hike' },
  { value: 'day_hike',       label: 'Day hike' },
  { value: 'pilgrimage',     label: 'Pilgrimage' },
  { value: 'cultural_walk',  label: 'Cultural walk' },
] as const;
const CLASS_OPTS = [
  { value: 'main',       label: 'Main' },
  { value: 'side',       label: 'Side' },
  { value: 'alternate',  label: 'Alternate' },
  { value: 'access',     label: 'Access' },
] as const;
const STATUS_OPTS = [
  { value: 'open',       label: 'Open' },
  { value: 'seasonal',   label: 'Seasonal' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'closed',     label: 'Closed' },
  { value: 'unknown',    label: 'Unknown' },
] as const;
const DIFFICULTY_OPTS = [
  { value: 'easy',     label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard',     label: 'Hard' },
  { value: 'extreme',  label: 'Extreme' },
] as const;
const MONTH_OPTS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
] as const;
const MONTH_LABEL = ['—', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  return <div className="pb-3 border-b border-outline-variant mb-4"><p className="text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>{title}</p></div>;
}

function findLabel<T extends { value: string; label: string }>(opts: readonly T[], value: string | null) {
  return opts.find(o => o.value === value)?.label ?? null;
}

function TypeChip({ val }: { val: string | null }) {
  const label = findLabel(TYPE_OPTS, val);
  if (!label) return null;
  const map: Record<string, { bg: string; color: string }> = {
    trek:          { bg: '#dae69f', color: '#5d682e' },
    hike:          { bg: '#d6e8f0', color: '#2c5a70' },
    day_hike:      { bg: '#e6dff0', color: '#4a3370' },
    pilgrimage:    { bg: '#ffdea3', color: '#261900' },
    cultural_walk: { bg: '#fdefd8', color: '#7a4a10' },
  };
  const s = map[val!] ?? { bg: '#e8e2d7', color: '#424844' };
  return <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px' }}>{label}</span>;
}

function TrailStatusChip({ val }: { val: string | null }) {
  const label = findLabel(STATUS_OPTS, val);
  if (!label) return null;
  const map: Record<string, { bg: string; color: string }> = {
    open:       { bg: '#c9ead6', color: '#1a4d2a' },
    seasonal:   { bg: '#fdefd8', color: '#7a4a10' },
    restricted: { bg: '#ffe0c0', color: '#8a3a00' },
    closed:     { bg: '#ffdad6', color: '#93000a' },
    unknown:    { bg: '#e8e2d7', color: '#727973' },
  };
  const s = map[val!] ?? { bg: '#e8e2d7', color: '#424844' };
  return <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px' }}>Trail: {label}</span>;
}

const STATUS_STYLE: Record<ContentStatus, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#e8e2d7', color: '#424844', label: 'Draft' },
  in_review: { bg: '#fdefd8', color: '#7a4a10', label: 'In review' },
  published: { bg: '#c9ead6', color: '#1a4d2a', label: 'Published' },
  archived:  { bg: '#e8d6d6', color: '#7a1a1a', label: 'Archived' },
};

function StatusBadge({ status }: { status: ContentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="px-2.5 py-1 rounded-full font-bold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.color, fontSize: '10px' }}
    >
      {s.label}
    </span>
  );
}

const catColors: Record<string, { bg: string; color: string }> = {
  trail: { bg: '#c9ead6', color: '#032014' },
  water: { bg: '#d6e8f0', color: '#2c5a70' },
  landmark: { bg: '#ffdea3', color: '#261900' },
  facility: { bg: '#dae69f', color: '#5d682e' },
  nature: { bg: '#c9ead6', color: '#032014' },
  cultural: { bg: '#fdefd8', color: '#7a4a10' },
  infrastructure: { bg: '#e8e2d7', color: '#424844' },
  safety: { bg: '#ffdad6', color: '#93000a' },
};

export default function RouteDetailClient({
  route,
  waypoints,
  nearby,
  contentStatus: initialStatus,
  initialGeom,
  media,
}: {
  route: TrekRoute;
  waypoints: Waypoint[];
  nearby: NearbyWaypoint[];
  contentStatus: ContentStatus;
  initialGeom: GeomGeoJSON | null;
  media: MediaItem[];
}) {
  const [data, setData] = useState({ ...route });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('waypoints');
  const tabsRef = useRef<HTMLDivElement>(null);
  const primaryMedia = media.find(m => m.is_primary) ?? media[0] ?? null;

  function jumpToMedia() {
    setActiveTab('media');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** IDs of nearby waypoints the user has linked since the page loaded — used to
   *  hide them from the nearby list without a refetch. */
  const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
  const [linkPending, startLinkTransition] = useTransition();

  // Waypoint color by category — matches the canonical POI palette.
  const wpColor: Record<string, string> = {
    trail: '#304d3e', water: '#2c5a70', landmark: '#ab8122', facility: '#5d682e',
    nature: '#304d3e', cultural: '#7a4a10', infrastructure: '#727973', safety: '#ba1a1a',
  };

  /** Markers to overlay on the map: on-route waypoints (with their type icon)
   *  + nearby unlinked waypoints rendered smaller. */
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    waypoints.forEach(wp => {
      if (wp.lon == null || wp.lat == null) return;
      const Icon = waypointIcon(wp.wp_icon);
      out.push({
        key: `on-${wp.id}`,
        lon: wp.lon, lat: wp.lat,
        color: wpColor[wp.wp_category] ?? '#727973',
        icon: <Icon size={14} strokeWidth={2.5} color="#ffffff" />,
        title: `#${wp.sequence_order ?? '?'} ${wp.name} (${wp.wp_type_label})`,
        size: 26,
      });
    });
    nearby.forEach(wp => {
      if (linkedIds.has(wp.id)) return;
      const Icon = waypointIcon(wp.wp_icon);
      out.push({
        key: `near-${wp.id}`,
        lon: wp.lon, lat: wp.lat,
        color: wpColor[wp.wp_category] ?? '#727973',
        icon: <Icon size={11} strokeWidth={2.5} color="#ffffff" />,
        title: `${wp.name} (${wp.wp_type_label}) — ${Math.round(wp.distance_m)}m off route`,
        size: 18,
      });
    });
    return out;
  }, [waypoints, nearby, linkedIds]);

  function linkNearby(wp: NearbyWaypoint) {
    startLinkTransition(async () => {
      const res = await linkWaypointToRoute(data.id, wp.id);
      if (res.ok) {
        setLinkedIds(prev => new Set(prev).add(wp.id));
        toast.success(`Linked “${wp.name}” to route (#${res.sequence_order ?? '?'})`);
      } else {
        toast.error(res.message ?? 'Link failed');
      }
    });
  }

  const update = useCallback(<K extends keyof TrekRoute>(key: K, value: TrekRoute[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  // Day-hike type uses hours; everything else uses days.
  const isHourlyDuration = data.type === 'day_hike' || data.type === 'hike' || data.type === 'cultural_walk';

  function handleSave() {
    const patch = {
      name:               data.name,
      name_dz:            data.name_dz,
      slug:               data.slug,
      summary:            data.summary,
      type:               data.type,
      class:              data.class,
      status:             data.status,
      difficulty:         data.difficulty,
      duration_days:      data.duration_days,
      duration_hours_min: data.duration_hours_min,
      duration_hours_max: data.duration_hours_max,
      distance_km:        data.distance_km,
      season_start_month: data.season_start_month,
      season_end_month:   data.season_end_month,
      season_open:        data.season_open,
      permit_required:    data.permit_required,
      permit_type:        data.permit_type,
      permit_notes:       data.permit_notes,
      fee_currency:       data.fee_currency,
      fee_amount:         data.fee_amount,
      highlights:         data.highlights,
      description:        data.description,
      remarks:            data.remarks,
    };
    startTransition(async () => {
      const res = await updateTrekRoute(data.id, patch);
      if (res.ok) {
        toast.success(`Saved · ${data.name}`);
        setDirty(false);
        if (res.contentStatus) setStatus(res.contentStatus);
      } else {
        const firstErr = res.errors ? Object.entries(res.errors)[0] : null;
        const msg = firstErr ? `${firstErr[0]}: ${firstErr[1]}` : (res.message ?? 'Save failed');
        toast.error(msg);
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setTrekRouteStatus(data.id, next);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* Header */}
      <div>
        <Link href="/routes" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Routes
        </Link>
        <div className="flex items-end justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={jumpToMedia}
              title={primaryMedia ? 'View / manage images' : 'No images yet — add one in the Media tab'}
              className="relative w-20 h-20 rounded-xl overflow-hidden border border-outline-variant shrink-0 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#f3ede2' }}
            >
              {primaryMedia?.cdn_url ? (
                <img src={primaryMedia.cdn_url} alt={primaryMedia.alt_text ?? ''} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon size={22} className="text-outline" />
                </div>
              )}
              {media.length > 0 && (
                <span className="absolute bottom-0.5 right-0.5 px-1 py-px rounded font-bold" style={{ backgroundColor: 'rgba(8,38,25,0.85)', color: '#ffdea3', fontSize: '9px' }}>
                  {media.length}
                </span>
              )}
            </button>
            <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <TypeChip val={data.type} />
              <TrailStatusChip val={data.status} />
              {data.class && <span className="text-outline" style={{ fontSize: '12px' }}>class: {data.class}</span>}
              <span className="font-mono text-outline text-sm border border-outline-variant px-2 py-0.5 rounded">RT-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name}</h1>
            {data.name_dz && <p className="text-on-surface-variant mt-0.5" style={{ fontSize: '14px' }}>{data.name_dz}</p>}
            {data.summary && <p className="text-on-surface-variant mt-2 max-w-2xl" style={{ fontSize: '14px', lineHeight: '20px' }}>{data.summary}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {data.distance_km != null && <span className="text-on-surface-variant" style={{ fontSize: '14px' }}>{data.distance_km.toFixed(1)} km</span>}
              {data.length_m != null && (
                <>
                  <span className="text-outline-variant">·</span>
                  <span className="text-outline" style={{ fontSize: '12px' }}>geom {(data.length_m / 1000).toFixed(1)} km</span>
                </>
              )}
              {data.elevation_gain_m != null && <><span className="text-outline-variant">·</span><span className="text-on-surface-variant" style={{ fontSize: '14px' }}>{data.elevation_gain_m.toLocaleString()} m gain</span></>}
              {data.duration_days != null && <><span className="text-outline-variant">·</span><span className="text-on-surface-variant" style={{ fontSize: '14px' }}>{data.duration_days} days</span></>}
              {data.duration_hours_min != null && (
                <>
                  <span className="text-outline-variant">·</span>
                  <span className="text-on-surface-variant" style={{ fontSize: '14px' }}>
                    {data.duration_hours_max != null
                      ? `${data.duration_hours_min}–${data.duration_hours_max} h`
                      : `${data.duration_hours_min} h`}
                  </span>
                </>
              )}
            </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            {status === 'draft' && (
              <Button onClick={() => transition('in_review')} disabled={pending}
                variant="outline" className="border border-on-tertiary-fixed-variant text-on-tertiary-fixed-variant bg-surface-container hover:bg-surface-container-high">
                <Eye size={14} className="mr-2" /> Submit for review
              </Button>
            )}
            {status === 'in_review' && (
              <>
                <Button onClick={() => transition('draft')} disabled={pending}
                  variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high">
                  Back to draft
                </Button>
                <Button onClick={() => transition('published')} disabled={pending}
                  className="bg-on-primary-fixed text-tertiary-fixed border-none hover:opacity-90">
                  <CheckCircle2 size={14} className="mr-2" /> Publish
                </Button>
              </>
            )}
            {status === 'published' && (
              <Button onClick={() => transition('in_review')} disabled={pending}
                variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high">
                <EyeOff size={14} className="mr-2" /> Unpublish
              </Button>
            )}
            {status === 'archived' && (
              <Button onClick={() => transition('draft')} disabled={pending}
                variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high">
                Restore to draft
              </Button>
            )}
            <Button variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high" disabled={!dirty || pending}
              onClick={() => { setData({ ...route }); setDirty(false); }}>
              <FileText size={14} className="mr-2" /> Discard
            </Button>
            <Button onClick={handleSave} disabled={!dirty || pending}
              className="bg-primary-container text-tertiary-fixed border-none hover:opacity-90">
              <Globe size={14} className="mr-2" /> {pending ? 'Saving…' : 'Save'}
            </Button>
            <DeleteButton onDelete={() => deleteTrekRoute(data.id)} redirectTo="/routes" entityLabel={data.name ?? 'this route'} />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* Left — Map placeholder + stats */}
        <div className="col-span-8 space-y-4">
          <Card className="border border-outline-variant rounded-xl shadow-none">
            <CardContent className="p-3">
              <LineGeomEditor entity="trek_route" id={data.id} initial={initialGeom} markers={mapMarkers} />
            </CardContent>
          </Card>

          {/* Stat boxes — loader-computed, read-only */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Ruler,    label: 'Distance',  value: data.distance_km != null ? `${data.distance_km.toFixed(1)} km` : '—' },
              { icon: Mountain, label: 'Elev. gain', value: data.elevation_gain_m != null ? `${data.elevation_gain_m.toLocaleString()} m` : '—' },
              { icon: Mountain, label: 'Min elev.',  value: data.elevation_min_m != null ? `${data.elevation_min_m.toLocaleString()} m` : '—' },
              { icon: Mountain, label: 'Max elev.',  value: data.elevation_max_m != null ? `${data.elevation_max_m.toLocaleString()} m` : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
                <CardContent className="p-3 flex items-center gap-2">
                  <Icon size={16} className="text-on-primary-fixed-variant flex-shrink-0" />
                  <div>
                    <p className="font-bold text-on-surface font-mono" style={{ fontSize: '14px' }}>{value}</p>
                    <p className="text-outline uppercase tracking-wide" style={{ fontSize: '10px' }}>{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right — Enrichment form */}
        <div className="col-span-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Route Enrichment</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>Fill missing fields to enrich this route</p>
            </CardHeader>
            <CardContent className="space-y-5 pb-14">
              {/* Identity */}
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <F label="Name (English)">
                    <Input value={data.name} onChange={e => update('name', e.target.value)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Name (Dzongkha)" hint="Optional. Native-script name.">
                    <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Slug" hint="URL identifier (lowercase, dashes).">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)}
                      placeholder="e.g. snowman-trek"
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Summary" hint="1–2 sentence pitch shown in cards.">
                    <Textarea value={data.summary ?? ''} onChange={e => update('summary', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              {/* Classification */}
              <div>
                <S title="Classification" />
                <div className="space-y-3">
                  <F label="Type">
                    <Select value={data.type ?? '__none'} onValueChange={v => update('type', v === '__none' ? null : v)}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Class">
                    <Select value={data.class ?? '__none'} onValueChange={v => update('class', v === '__none' ? null : v)}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {CLASS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Difficulty">
                    <Select value={data.difficulty ?? '__none'} onValueChange={v => update('difficulty', v === '__none' ? null : v as TrekRoute['difficulty'])}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {DIFFICULTY_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Trail status" hint="Operational state (separate from editorial workflow).">
                    <Select value={data.status ?? '__none'} onValueChange={v => update('status', v === '__none' ? null : v as TrekRoute['status'])}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Unknown" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Not set</SelectItem>
                        {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                </div>
              </div>

              {/* Timing */}
              <div>
                <S title="Timing" />
                <div className="space-y-3">
                  <F label="Distance (km)" hint="Editor curated. Loader-computed length: above.">
                    <Input type="number" step="0.1" min={0} value={data.distance_km ?? ''} placeholder="Not set"
                      onChange={e => update('distance_km', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  {isHourlyDuration ? (
                    <div className="grid grid-cols-2 gap-2">
                      <F label="Hours (min)">
                        <Input type="number" step="0.5" min={0} value={data.duration_hours_min ?? ''}
                          onChange={e => update('duration_hours_min', e.target.value ? Number(e.target.value) : null)}
                          className="border-outline-variant h-9 text-sm" />
                      </F>
                      <F label="Hours (max)">
                        <Input type="number" step="0.5" min={0} value={data.duration_hours_max ?? ''}
                          onChange={e => update('duration_hours_max', e.target.value ? Number(e.target.value) : null)}
                          className="border-outline-variant h-9 text-sm" />
                      </F>
                    </div>
                  ) : (
                    <F label="Duration (days)">
                      <Input type="number" min={1} value={data.duration_days ?? ''} placeholder="Not set"
                        onChange={e => update('duration_days', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <F label="Season start">
                      <Select value={data.season_start_month?.toString() ?? '__none'}
                        onValueChange={v => update('season_start_month', v === '__none' ? null : Number(v))}>
                        <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">—</SelectItem>
                          {MONTH_OPTS.map(o => <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Season end">
                      <Select value={data.season_end_month?.toString() ?? '__none'}
                        onValueChange={v => update('season_end_month', v === '__none' ? null : Number(v))}>
                        <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">—</SelectItem>
                          {MONTH_OPTS.map(o => <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                  </div>
                  <F label="Season notes" hint="Free-form (e.g. closures, monsoon caveats).">
                    <Input value={data.season_open ?? ''} placeholder="e.g. avoid heavy monsoon Jul–Aug"
                      onChange={e => update('season_open', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                </div>
              </div>

              {/* Permits & fees */}
              <div>
                <S title="Permits & Fees" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-on-surface-variant">Permit required</Label>
                    <Switch checked={!!data.permit_required} onCheckedChange={v => update('permit_required', v ? 1 : 0)}
                      className="data-[state=checked]:bg-on-primary-fixed-variant" />
                  </div>
                  {data.permit_required ? (
                    <>
                      <F label="Permit type">
                        <Input value={data.permit_type ?? ''} placeholder="e.g. National Park"
                          onChange={e => update('permit_type', e.target.value || null)}
                          className="border-outline-variant h-9 text-sm" />
                      </F>
                      <F label="Permit notes">
                        <Textarea value={data.permit_notes ?? ''} onChange={e => update('permit_notes', e.target.value || null)}
                          rows={2} className="border-outline-variant text-sm resize-none"
                          placeholder="Who issues, lead time, additional restrictions…" />
                      </F>
                    </>
                  ) : null}
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <F label="Currency" hint="ISO 4217">
                      <Input value={data.fee_currency ?? ''} placeholder="USD"
                        onChange={e => update('fee_currency', (e.target.value || null) as string | null)}
                        className="border-outline-variant h-9 text-sm font-mono uppercase"
                        maxLength={3} />
                    </F>
                    <F label="Fee amount">
                      <Input type="number" step="0.01" min={0} value={data.fee_amount ?? ''}
                        onChange={e => update('fee_amount', e.target.value ? Number(e.target.value) : null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <S title="Content" />
                <div className="space-y-3">
                  <F label="Highlights" hint="One per line; rendered as a bullet list.">
                    <Textarea value={data.highlights ?? ''} onChange={e => update('highlights', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" placeholder="Key highlights…" />
                  </F>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={5} className="border-outline-variant text-sm resize-none" placeholder="Route description…" />
                  </F>
                  <F label="Remarks">
                    <Textarea value={data.remarks ?? ''} onChange={e => update('remarks', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none"
                      placeholder="Internal notes, caveats, source quirks…" />
                  </F>
                </div>
              </div>
            </CardContent>

            {dirty && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 border-t border-outline-variant rounded-b-xl bg-secondary-container">
                <span className="font-medium text-on-secondary-container" style={{ fontSize: '13px' }}>Unsaved changes</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setData({ ...route }); setDirty(false); }} className="text-on-surface-variant">Discard</Button>
                  <Button size="sm" onClick={handleSave} disabled={pending} className="bg-on-primary-fixed-variant text-tertiary-fixed border-none hover:opacity-90">
                    {pending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom tabs */}
      <Card ref={tabsRef} className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-outline-variant bg-transparent rounded-none px-6 pt-1 gap-1 w-full justify-start">
            {[
              { value: 'waypoints', label: `Waypoints (${waypoints.length})` },
              { value: 'nearby',    label: `Nearby (${nearby.filter(n => !linkedIds.has(n.id)).length})` },
              { value: 'birds', label: 'Birds to Spot' },
              { value: 'media', label: 'Media' },
              { value: 'reviews', label: 'Reviews' },
            ].map(({ value, label }) => (
              <TabsTrigger key={value} value={value}
                className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-on-surface data-[state=active]:bg-transparent data-[state=active]:shadow-none text-on-surface-variant data-[state=active]:text-on-surface"
                style={{ fontSize: '14px' }}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="waypoints" className="p-0 m-0">
            {waypoints.length === 0 ? (
              <div className="py-12 text-center text-outline" style={{ fontSize: '14px' }}>No waypoints linked to this route</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-container-high">
                  <tr className="border-b border-outline-variant">
                    {['#', 'Seq', 'Name', 'Type', 'Category', 'Distance from start', 'Elevation', 'In app', 'Visible'].map(h => (
                      <th key={h} className="px-5 py-3 font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '11px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {waypoints.map(wp => {
                    const cc = catColors[wp.wp_category] ?? { bg: '#e8e2d7', color: '#424844' };
                    const Icon = waypointIcon(wp.wp_icon);
                    const wpColorVal = wpColor[wp.wp_category] ?? '#727973';
                    return (
                      <tr key={wp.id} className="hover:bg-surface-container">
                        <td className="px-5 py-3 font-mono text-outline" style={{ fontSize: '11px' }}>{wp.id}</td>
                        <td className="px-5 py-3 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>{wp.sequence_order ?? '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center rounded-full" style={{ backgroundColor: wpColorVal, width: 22, height: 22 }}>
                              <Icon size={12} strokeWidth={2.5} color="#ffffff" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>{wp.name || '—'}</div>
                              {wp.name_dz && <div className="text-outline" style={{ fontSize: '11px' }}>{wp.name_dz}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-on-surface-variant" style={{ fontSize: '13px' }}>{wp.wp_type_label || wp.wp_type || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full font-bold capitalize" style={{ backgroundColor: cc.bg, color: cc.color, fontSize: '10px' }}>{wp.wp_category}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>
                          {wp.distance_from_start_km != null ? `${wp.distance_from_start_km.toFixed(2)} km` : '—'}
                        </td>
                        <td className="px-5 py-3 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>
                          {wp.elevation_m != null ? `${wp.elevation_m.toLocaleString()} m` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <ReadOnlyFlag on={!!wp.show_in_app} hint="Canonical (from waypoint type)" />
                        </td>
                        <td className="px-5 py-3">
                          <ReadOnlyFlag on={!!wp.is_visible} hint="Editor-controlled per waypoint" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TabsContent>

          <TabsContent value="nearby" className="p-0 m-0">
            {(() => {
              const visibleNearby = nearby.filter(n => !linkedIds.has(n.id));
              if (visibleNearby.length === 0) {
                return (
                  <div className="py-12 text-center text-outline" style={{ fontSize: '14px' }}>
                    {nearby.length === 0
                      ? 'No waypoints within 500m of this route.'
                      : 'All nearby waypoints have been linked. Nice.'}
                  </div>
                );
              }
              return (
                <>
                  <div className="px-6 py-3 bg-surface-container-high border-b border-outline-variant text-on-surface-variant" style={{ fontSize: '13px' }}>
                    {visibleNearby.length} waypoint{visibleNearby.length === 1 ? '' : 's'} within 500m of this route, not yet linked.
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-high">
                      <tr className="border-b border-outline-variant">
                        {['#', 'Name', 'Type', 'Category', 'District', 'Elevation', 'Distance', ''].map(h => (
                          <th key={h} className="px-5 py-3 font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '11px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {visibleNearby.map(wp => {
                        const cc = catColors[wp.wp_category] ?? { bg: '#e8e2d7', color: '#424844' };
                        const Icon = waypointIcon(wp.wp_icon);
                        const wpColorVal = wpColor[wp.wp_category] ?? '#727973';
                        return (
                          <tr key={wp.id} className="hover:bg-surface-container">
                            <td className="px-5 py-3 font-mono text-outline" style={{ fontSize: '11px' }}>{wp.id}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: wpColorVal, width: 22, height: 22 }}>
                                  <Icon size={12} strokeWidth={2.5} color="#ffffff" />
                                </span>
                                <div className="min-w-0">
                                  <Link href={`/waypoints/${wp.id}`} className="font-semibold text-on-surface hover:text-on-primary-fixed-variant block" style={{ fontSize: '13px' }}>{wp.name || '—'}</Link>
                                  {wp.name_dz && <div className="text-outline" style={{ fontSize: '11px' }}>{wp.name_dz}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant" style={{ fontSize: '13px' }}>{wp.wp_type_label || wp.wp_type || '—'}</td>
                            <td className="px-5 py-3">
                              <span className="px-2 py-0.5 rounded-full font-bold capitalize" style={{ backgroundColor: cc.bg, color: cc.color, fontSize: '10px' }}>{wp.wp_category}</span>
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant" style={{ fontSize: '13px' }}>{wp.district || '—'}</td>
                            <td className="px-5 py-3 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>
                              {wp.elevation_m != null ? `${wp.elevation_m.toLocaleString()} m` : '—'}
                            </td>
                            <td className="px-5 py-3 font-mono text-on-surface" style={{ fontSize: '12px' }}>
                              {wp.distance_m < 1000
                                ? `${Math.round(wp.distance_m)} m`
                                : `${(wp.distance_m / 1000).toFixed(2)} km`}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                disabled={linkPending}
                                onClick={() => linkNearby(wp)}
                                className="inline-flex items-center gap-1 px-3 h-8 rounded bg-on-primary-fixed-variant text-tertiary-fixed hover:opacity-90 disabled:opacity-50"
                                style={{ fontSize: '12px', fontWeight: 600 }}
                              >
                                <Plus size={12} /> Link to route
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="birds" className="p-5 m-0">
            <p className="text-outline" style={{ fontSize: '13px' }}>Bird location links will be pulled from the location_bird_species table once spatial queries are implemented in the backend.</p>
          </TabsContent>

          <TabsContent value="media" className="p-5 m-0">
            <EntityMediaPanel
              entityType="trek_route"
              entityId={route.id}
              items={media}
              revalidatePaths={[`/routes/${route.id}`, '/media']}
            />
          </TabsContent>

          <TabsContent value="reviews" className="p-5 m-0">
            <div className="text-center py-8 text-outline" style={{ fontSize: '14px' }}>No reviews yet for this route.</div>
          </TabsContent>
        </Tabs>
      </Card>

      <UnsavedBar dirty={dirty} onSave={handleSave} onDiscard={() => { setData({ ...route }); setDirty(false); }} saving={pending} />
    </div>
  );
}

function ReadOnlyFlag({ on, hint }: { on: boolean; hint: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold uppercase tracking-wide"
      style={{
        backgroundColor: on ? '#c9ead6' : '#e8e2d7',
        color: on ? '#1a4d2a' : '#727973',
        fontSize: '10px',
      }}
      title={hint}
    >
      <span style={{ fontSize: '11px' }}>{on ? '✓' : '–'}</span>
      {on ? 'Yes' : 'No'}
    </span>
  );
}
