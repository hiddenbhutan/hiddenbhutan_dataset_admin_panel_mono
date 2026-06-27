'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, ChevronDown, SlidersHorizontal, X, Edit3, CheckCircle2, Map as MapIcon, Plus } from 'lucide-react';
import type { POI, POICategoryCount } from '@/lib/db';
import POIMap, { POI_COLORS, type POIMapItem } from '@/components/map/POIMap';

// ── design-spec typography helpers ──────────────────────────────────────────
const displayLgStyle: React.CSSProperties = { fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em' };
const headlineMdStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 600, lineHeight: '28px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const labelCapsStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, lineHeight: '16px', letterSpacing: '0.05em' };
const labelTinyStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 700, lineHeight: '14px', letterSpacing: '0.05em' };
const dataMonoStyle: React.CSSProperties = { fontSize: '12px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', lineHeight: '16px' };

const CATEGORY_LABEL: Record<string, string> = {
  locality:      'Village',
  waypoint:      'Waypoint',
  heritage_site: 'Heritage',
  dzong:         'Dzong',
  health_center: 'Health',
  school:        'School',
};

/** /poi categories → detail page route */
const CATEGORY_HREF: Record<string, string> = {
  locality:      '/villages',
  waypoint:      '/waypoints',
  heritage_site: '/heritage',
  dzong:         '/dzongs',
  health_center: '/health-centers',
  school:        '/schools',
};

const CATEGORY_GROUPS: Array<{ key: string; label: string; cats: string[] }> = [
  { key: 'all',      label: 'All',      cats: [] },
  { key: 'village',  label: 'Village',  cats: ['locality', 'waypoint'] },
  { key: 'heritage', label: 'Heritage', cats: ['heritage_site', 'dzong'] },
  { key: 'health',   label: 'Health',   cats: ['health_center'] },
  { key: 'school',   label: 'School',   cats: ['school'] },
];

export default function POIBrowserClient({
  pois,
  counts,
}: {
  pois: POI[];
  counts: POICategoryCount[];
}) {
  const [activeGroup, setActiveGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'district'>('recent');
  const [selected, setSelected] = useState<POIMapItem | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(true);

  const totalCount = useMemo(() => counts.reduce((s, c) => s + c.count, 0), [counts]);

  const filtered = useMemo<POIMapItem[]>(() => {
    const group = CATEGORY_GROUPS.find(g => g.key === activeGroup);
    const allowed = group && group.cats.length > 0 ? new Set(group.cats) : null;
    const q = search.trim().toLowerCase();
    const items = pois
      .filter(p => p.lon != null && p.lat != null)
      .filter(p => !allowed || allowed.has(p.category))
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.district ?? '').toLowerCase().includes(q))
      .map(p => ({
        category: p.category,
        ref_id: p.ref_id,
        name: p.name,
        name_dz: p.name_dz,
        subtype: p.subtype,
        district: p.district,
        lon: p.lon as number,
        lat: p.lat as number,
      }));
    if (sortBy === 'name')     items.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'district') items.sort((a, b) => (a.district ?? '').localeCompare(b.district ?? ''));
    return items;
  }, [pois, activeGroup, search, sortBy]);

  // Stats for the dark panel footer
  const integrity = useMemo(() => {
    if (pois.length === 0) return 0;
    const withCoords = pois.filter(p => p.lon != null && p.lat != null).length;
    return Math.round((withCoords / pois.length) * 1000) / 10;
  }, [pois]);

  const editHref = selected ? `${CATEGORY_HREF[selected.category] ?? ''}/${selected.ref_id}` : '#';

  return (
    // Negative margin to cancel out the Shell's p-6 so the map fills the
    // content area while keeping the sidebar + topbar chrome intact. Inline
    // height (vs Tailwind arbitrary value) avoids any parser quirks with
    // calc() spacing.
    <div
      className="-m-6 relative overflow-hidden bg-surface-container"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Map canvas */}
      <POIMap items={filtered} selected={selected} onSelect={setSelected} />

      {/* ── Dark "POI Directory" floating panel ──────────────────────────── */}
      <aside
        className="absolute top-4 left-4 bottom-4 w-[320px] flex flex-col rounded-xl border border-on-primary-fixed-variant/50 shadow-2xl overflow-hidden z-30"
        style={{ backgroundColor: '#07140D' }}
      >
        {/* Header & search */}
        <div className="p-6 pb-4 border-b border-on-primary-fixed-variant/30">
          <h3 className="text-secondary-fixed mb-4" style={headlineMdStyle}>POI Directory</h3>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-variant/60" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search POIs, districts…"
              className="w-full bg-primary-container border border-outline-variant/30 text-surface-variant py-2.5 pl-10 pr-4 rounded-lg focus:ring-2 focus:ring-secondary-fixed-dim focus:border-transparent outline-none transition-all placeholder:text-surface-variant/40"
              style={{ fontSize: '13px' }}
            />
          </div>
          <div className="flex items-center justify-between text-surface-variant/60" style={labelTinyStyle}>
            <span className="flex items-center gap-1">
              Sort by:
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'recent' | 'name' | 'district')}
                className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-secondary-fixed pr-3 appearance-none"
                style={labelTinyStyle}
              >
                <option value="recent" className="text-on-surface">Recent</option>
                <option value="name" className="text-on-surface">Name</option>
                <option value="district" className="text-on-surface">District</option>
              </select>
              <ChevronDown size={10} className="-ml-2 pointer-events-none text-secondary-fixed" />
            </span>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="hover:text-secondary-fixed transition-colors flex items-center gap-1"
            >
              <SlidersHorizontal size={11} /> Filter
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="px-6 py-4 flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          {CATEGORY_GROUPS.map(g => {
            const active = g.key === activeGroup;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setActiveGroup(g.key)}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors uppercase ${
                  active
                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                    : 'bg-primary-container text-surface-variant/80 border border-outline-variant/30 hover:border-secondary-fixed'
                }`}
                style={labelCapsStyle}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        {/* Results list */}
        <div className="flex-grow overflow-y-auto px-2 py-2 space-y-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-surface-variant/60" style={bodySmStyle}>
              No POIs match your filters.
            </div>
          )}
          {filtered.slice(0, 200).map(poi => {
            const isSelected = selected?.category === poi.category && selected.ref_id === poi.ref_id;
            return (
              <button
                key={`${poi.category}-${poi.ref_id}`}
                type="button"
                onClick={() => { setSelected(poi); setQuickViewOpen(true); }}
                className={`block w-full text-left p-4 mb-1 rounded-lg cursor-pointer transition-colors group border ${
                  isSelected
                    ? 'bg-on-primary-fixed-variant/40 border-on-primary-fixed-variant/30'
                    : 'border-transparent hover:bg-on-primary-fixed-variant/40 hover:border-on-primary-fixed-variant/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2 gap-3">
                  <h4 className="text-secondary-fixed group-hover:text-surface-bright flex-1 min-w-0 truncate" style={titleSmStyle}>
                    {poi.name}
                  </h4>
                  <span
                    className="px-1.5 py-0.5 rounded border uppercase tracking-tighter flex-shrink-0"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: `${POI_COLORS[poi.category] ?? '#727973'}33`,
                      color: POI_COLORS[poi.category] ?? '#727973',
                      borderColor: `${POI_COLORS[poi.category] ?? '#727973'}66`,
                    }}
                  >
                    {CATEGORY_LABEL[poi.category] ?? poi.category}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-surface-variant/60" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="opacity-70" />
                    <span className="truncate">
                      {poi.district ?? 'Unknown district'}{poi.subtype ? ` · ${poi.subtype}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center opacity-40" style={dataMonoStyle}>
                    <span>{poi.lat.toFixed(3)}° N, {poi.lon.toFixed(3)}° E</span>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length > 200 && (
            <div className="px-4 py-2 text-surface-variant/60 text-center" style={bodySmStyle}>
              Showing first 200 of {filtered.length}. Narrow the filter to see more.
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="p-4 bg-primary border-t border-on-primary-fixed-variant/30 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-surface-variant/40" style={labelTinyStyle}>Visible POIs</p>
            <p className="text-secondary-fixed" style={titleSmStyle}>
              {filtered.length.toLocaleString()} <span style={bodySmStyle}>of {totalCount.toLocaleString()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-surface-variant/40" style={labelTinyStyle}>Coverage</p>
            <p className="text-on-primary-container" style={titleSmStyle}>{integrity}%</p>
          </div>
        </div>
      </aside>

      {/* ── Quick-View panel for the selected POI ───────────────────────── */}
      {selected && quickViewOpen && (
        <div className="absolute top-4 right-4 bg-surface-container-highest p-6 rounded-xl border border-outline-variant shadow-2xl w-80 z-40">
          <div className="flex justify-between items-start mb-4">
            <h5 className="text-secondary uppercase" style={labelCapsStyle}>Quick View</h5>
            <button
              type="button"
              onClick={() => setQuickViewOpen(false)}
              className="text-on-surface-variant hover:text-primary"
              aria-label="Close quick view"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-4 mb-4 items-start">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${POI_COLORS[selected.category] ?? '#727973'}1A` }}
            >
              <MapPin size={28} style={{ color: POI_COLORS[selected.category] ?? '#727973' }} />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-primary leading-tight mb-1 truncate" style={headlineMdStyle}>{selected.name}</p>
              <p className="text-on-surface-variant" style={bodySmStyle}>
                {CATEGORY_LABEL[selected.category] ?? selected.category}
                {selected.district ? ` · ${selected.district}` : ''}
              </p>
              {selected.name_dz && (
                <p className="text-outline italic mt-0.5" style={bodySmStyle}>{selected.name_dz}</p>
              )}
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <div className="flex justify-between" style={bodySmStyle}>
              <span className="text-on-surface-variant">Coordinates</span>
              <span className="text-on-surface" style={dataMonoStyle}>
                {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
              </span>
            </div>
            {selected.subtype && (
              <div className="flex justify-between" style={bodySmStyle}>
                <span className="text-on-surface-variant">Subtype</span>
                <span className="text-on-surface">{selected.subtype}</span>
              </div>
            )}
            <div className="flex justify-between" style={bodySmStyle}>
              <span className="text-on-surface-variant">Reference ID</span>
              <span className="text-outline" style={dataMonoStyle}>{selected.category}#{selected.ref_id}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={editHref}
              className="w-full py-2 bg-primary text-on-primary rounded uppercase text-center flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors"
              style={labelCapsStyle}
            >
              <Edit3 size={12} /> Edit Details
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { /* keeps the map flown-to position */ }}
                className="py-2 border border-outline text-primary rounded uppercase flex items-center justify-center gap-1.5 hover:bg-surface-variant transition-colors"
                style={labelCapsStyle}
              >
                <MapIcon size={12} /> View in Map
              </button>
              <button
                type="button"
                onClick={() => alert('Verification workflow not yet wired.')}
                className="py-2 border border-outline text-primary rounded uppercase flex items-center justify-center gap-1.5 hover:bg-surface-variant transition-colors"
                style={labelCapsStyle}
              >
                <CheckCircle2 size={12} /> Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend (bottom-right) ────────────────────────────────────────── */}
      <div className="absolute bottom-6 right-6 bg-surface-container-highest p-4 rounded-xl border border-outline-variant shadow-xl w-48 z-30">
        <p className="text-secondary mb-3 uppercase tracking-widest" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em' }}>Map Legend</p>
        <div className="space-y-2">
          <LegendDot color={POI_COLORS.heritage_site} label="Heritage / Dzong" />
          <LegendDot color={POI_COLORS.locality}      label="Village / Waypoint" />
          <LegendDot color={POI_COLORS.health_center} label="Health / Emergency" />
          <LegendDot color={POI_COLORS.school}        label="School" />
        </div>
      </div>

      {/* ── "Add New POI" FAB (links into the canonical creation flow) ──── */}
      <Link
        href="/waypoints"
        className="absolute bottom-6 left-[352px] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-secondary text-on-secondary hover:scale-105 active:scale-95 transition-all z-30"
        title="Add a new POI"
        aria-label="Add a new POI"
      >
        <Plus size={28} />
      </Link>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-on-surface-variant" style={{ fontSize: '11px' }}>{label}</span>
    </div>
  );
}
