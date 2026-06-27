'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaEntityType, MediaKind, MediaLicense } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, X } from 'lucide-react';

const STATUS_PILLS: Array<{ value: 'all' | 'draft' | 'in_review' | 'published' | 'archived'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
];

const KIND_OPTS: { value: MediaKind; label: string }[] = [
  { value: 'image',        label: 'Image' },
  { value: 'video',        label: 'Video' },
  { value: 'audio',        label: 'Audio' },
  { value: 'panorama_360', label: '360° panorama' },
  { value: 'model_3d',     label: '3D model' },
];

const LICENSE_OPTS: { value: MediaLicense; label: string }[] = [
  { value: 'all_rights_reserved',  label: 'All rights reserved' },
  { value: 'cc0',                  label: 'CC0' },
  { value: 'cc_by',                label: 'CC BY' },
  { value: 'cc_by_sa',             label: 'CC BY-SA' },
  { value: 'cc_by_nc',             label: 'CC BY-NC' },
  { value: 'cc_by_nc_sa',          label: 'CC BY-NC-SA' },
  { value: 'public_domain',        label: 'Public domain' },
  { value: 'used_with_permission', label: 'Used with permission' },
];

const ENTITY_LABEL: Record<MediaEntityType, string> = {
  locality: 'Locality', trek_route: 'Route', waypoint: 'Waypoint',
  heritage_site: 'Heritage', dzong: 'Dzong', dzong_lhakhang: 'Lhakhang',
  health_center: 'Health center', school: 'School',
  conservation_area: 'Conservation area', biological_corridor: 'Corridor',
  festival: 'Festival', thangka: 'Thangka',
  cuisine_item: 'Cuisine', cuisine_ingredient: 'Ingredient',
  species: 'Species', species_occurrence: 'Sighting',
  historical_figure: 'Figure',
  zorig_chusum: 'Zorig Chusum', national_symbol: 'National symbol',
  cultural_custom: 'Custom', traditional_game: 'Traditional game',
};

export default function MediaFilterBar({
  entityCounts,
  initial,
}: {
  entityCounts: Array<{ entity_type: MediaEntityType; count: number }>;
  initial: {
    entity: MediaEntityType | 'all';
    kind: MediaKind | 'all';
    license: MediaLicense | 'all';
    status: 'all' | 'draft' | 'in_review' | 'published' | 'archived';
    primary: boolean;
    q: string;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  function push(next: typeof state) {
    setState(next);
    const params = new URLSearchParams();
    if (next.entity  !== 'all') params.set('entity', next.entity);
    if (next.kind    !== 'all') params.set('kind', next.kind);
    if (next.license !== 'all') params.set('license', next.license);
    if (next.status  !== 'all') params.set('status', next.status);
    if (next.primary)           params.set('primary', '1');
    if (next.q)                 params.set('q', next.q);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/media?${qs}` : '/media');
    });
  }

  function clearAll() {
    push({ entity: 'all', kind: 'all', license: 'all', status: 'all', primary: false, q: '' });
  }

  const hasFilters =
    state.entity !== 'all' || state.kind !== 'all' || state.license !== 'all' ||
    state.status !== 'all' || state.primary || state.q;

  return (
    <Card className="p-4 border-[#c2c8c2] bg-[#f9f3e8] space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-[#c2c8c2] rounded-lg overflow-hidden bg-white">
          {STATUS_PILLS.map(p => (
            <button key={p.value}
              onClick={() => push({ ...state, status: p.value })}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: state.status === p.value ? '#304d3e' : 'white',
                color: state.status === p.value ? '#ffdea3' : '#424844',
                fontSize: '13px', fontWeight: 600,
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <Select value={state.entity} onValueChange={v => { if (v) push({ ...state, entity: v as MediaEntityType | 'all' }); }}>
          <SelectTrigger className="w-48 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {entityCounts.map(e => (
              <SelectItem key={e.entity_type} value={e.entity_type}>
                {ENTITY_LABEL[e.entity_type] ?? e.entity_type} ({e.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={state.kind} onValueChange={v => { if (v) push({ ...state, kind: v as MediaKind | 'all' }); }}>
          <SelectTrigger className="w-36 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Kind" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {KIND_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.license} onValueChange={v => { if (v) push({ ...state, license: v as MediaLicense | 'all' }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="License" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All licenses</SelectItem>
            {LICENSE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#424844]" size={14} />
          <Input
            value={state.q}
            onChange={e => setState({ ...state, q: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') push(state); }}
            onBlur={() => { if (state.q !== initial.q) push(state); }}
            placeholder="Alt, caption, photographer, key…"
            className="pl-9 h-9 w-64 border-[#c2c8c2] bg-white text-sm"
          />
        </div>

        {hasFilters && (
          <button onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#c2c8c2] bg-white hover:bg-[#ede8dd] transition-colors"
            style={{ fontSize: '12px', color: '#424844', fontWeight: 600 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#e8e2d7]">
        <div className="flex items-center gap-2">
          <Switch checked={state.primary} onCheckedChange={v => push({ ...state, primary: v })} className="data-[state=checked]:bg-[#304d3e]" />
          <span className="text-[#424844]" style={{ fontSize: '13px' }}>Primary (hero) only</span>
        </div>
      </div>
    </Card>
  );
}
