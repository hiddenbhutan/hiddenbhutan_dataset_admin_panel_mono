'use client';

import { useState, useMemo } from 'react';
import type { TrekRoute, TrekRouteStatusCounts } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Search, MoreVertical, SlidersHorizontal, X, PencilLine, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PAGE_SIZE = 25;

// Typography helpers from the design spec.
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const bodySmBoldStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, lineHeight: '18px' };
const dataMonoStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 400, lineHeight: '16px', fontFamily: 'JetBrains Mono, monospace',
};

// content.trail_difficulty enum values + display labels.
const DIFFICULTY: Record<string, { label: string; bg: string; color: string }> = {
  easy:     { label: 'Easy',     bg: '#c9ead6', color: '#032014' },
  moderate: { label: 'Moderate', bg: '#fdefd8', color: '#7a4a10' },
  hard:     { label: 'Hard',     bg: '#ffdad6', color: '#93000a' },
  extreme:  { label: 'Extreme',  bg: '#f8c4be', color: '#5c0006' },
};

// content.trail_type enum values + display labels.
const TYPE: Record<string, { label: string; bg: string; color: string }> = {
  trek:           { label: 'Trek',         bg: '#dae69f', color: '#5d682e' },
  hike:           { label: 'Hike',         bg: '#d6e8f0', color: '#2c5a70' },
  day_hike:       { label: 'Day hike',     bg: '#e6dff0', color: '#4a3370' },
  pilgrimage:     { label: 'Pilgrimage',   bg: '#ffdea3', color: '#261900' },
  cultural_walk:  { label: 'Cult. walk',   bg: '#fdefd8', color: '#7a4a10' },
};

// content.trail_status enum (operational, distinct from content_status).
const TRAIL_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  open:       { label: 'Open',       bg: '#c9ead6', color: '#1a4d2a' },
  seasonal:   { label: 'Seasonal',   bg: '#fdefd8', color: '#7a4a10' },
  restricted: { label: 'Restricted', bg: '#ffe0c0', color: '#8a3a00' },
  closed:     { label: 'Closed',     bg: '#ffdad6', color: '#93000a' },
  unknown:    { label: 'Unknown',    bg: '#e8e2d7', color: '#727973' },
};

// content.content_status — editorial workflow.
const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

function EnumChip({ value, map, size = 'md' }: {
  value: string | null | undefined;
  map: Record<string, { label: string; bg: string; color: string }>;
  size?: 'sm' | 'md';
}) {
  if (!value) return <NotSet />;
  const e = map[value];
  if (!e) return <span className="text-on-surface-variant" style={bodySmStyle}>{value}</span>;
  return (
    <span
      className="inline-block rounded-full uppercase whitespace-nowrap"
      style={{
        ...labelCapsStyle,
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: '2px 8px',
        backgroundColor: e.bg,
        color: e.color,
      }}
    >
      {e.label}
    </span>
  );
}

function NotSet() {
  return (
    <span className="inline-block border border-dashed border-outline-variant text-on-surface-variant uppercase"
      style={{ ...labelCapsStyle, padding: '2px 8px', borderRadius: '0.25rem' }}>
      Not set
    </span>
  );
}

const MONTH_LABEL = ['—', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatSeason(r: TrekRoute) {
  if (r.season_start_month && r.season_end_month) {
    return `${MONTH_LABEL[r.season_start_month]}–${MONTH_LABEL[r.season_end_month]}`;
  }
  return r.season_open ?? null;
}

function formatDuration(r: TrekRoute) {
  if (r.duration_days) return `${r.duration_days}d`;
  if (r.duration_hours_min != null && r.duration_hours_max != null) {
    return `${r.duration_hours_min}–${r.duration_hours_max}h`;
  }
  if (r.duration_hours_min != null) return `${r.duration_hours_min}h`;
  return null;
}

export default function RoutesTable({
  routes,
  statusCounts,
}: {
  routes: TrekRoute[];
  statusCounts?: TrekRouteStatusCounts;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [contentStatusFilter, setContentStatusFilter] = useState<string>('all');
  const [missingOnly, setMissingOnly] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => routes.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (diffFilter !== 'all') {
      if (diffFilter === '__none' && r.difficulty !== null) return false;
      if (diffFilter !== '__none' && r.difficulty !== diffFilter) return false;
    }
    if (contentStatusFilter !== 'all' && r.content_status !== contentStatusFilter) return false;
    if (missingOnly && r.difficulty && (r.duration_days || r.duration_hours_min) && (r.season_open || r.season_start_month)) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [routes, typeFilter, diffFilter, contentStatusFilter, missingOnly, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSelect(id: number) {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }
  function toggleAll() {
    setSelected(prev => prev.size === paged.length ? new Set() : new Set(paged.map(r => r.id)));
  }

  const statusPills: Array<{ key: string; label: string; count?: number }> = [
    { key: 'all',       label: 'All',       count: statusCounts?.total },
    { key: 'draft',     label: 'Draft',     count: statusCounts?.draft },
    { key: 'in_review', label: 'In review', count: statusCounts?.in_review },
    { key: 'published', label: 'Published', count: statusCounts?.published },
    { key: 'archived',  label: 'Archived',  count: statusCounts?.archived },
  ];

  const startIdx = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-4">
      {/* Filter card — spec: surface-container-low + outline-variant + rounded-xl + 12-col grid */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 lg:col-span-5">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Workflow</p>
            <div className="flex border border-outline-variant rounded-lg overflow-hidden bg-surface-container-highest">
              {statusPills.map(p => {
                const active = contentStatusFilter === p.key;
                return (
                  <button key={p.key} onClick={() => { setContentStatusFilter(p.key); setPage(0); }}
                    className="px-3 py-2 transition-colors flex items-center gap-1.5"
                    style={{
                      ...bodySmStyle,
                      flex: 1,
                      backgroundColor: active ? 'var(--color-on-primary-fixed-variant)' : 'transparent',
                      color:           active ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)',
                      fontWeight: active ? 700 : 600,
                    }}>
                    <span className="truncate">{p.label}</span>
                    {p.count != null && (
                      <span style={{ ...dataMonoStyle, opacity: 0.7 }}>{p.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Type</p>
            <Select value={typeFilter} onValueChange={v => { if (v) { setTypeFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest" style={bodySmStyle}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(TYPE).map(([v, e]) => <SelectItem key={v} value={v}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Difficulty</p>
            <Select value={diffFilter} onValueChange={v => { if (v) { setDiffFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest" style={bodySmStyle}>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                {Object.entries(DIFFICULTY).map(([v, e]) => <SelectItem key={v} value={v}>{e.label}</SelectItem>)}
                <SelectItem value="__none">Not set</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Filter routes…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest"
                style={bodySmStyle} />
            </div>
          </div>
        </div>

        {/* Toggles + count row */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-outline-variant">
          <button
            onClick={() => { setMissingOnly(p => !p); setPage(0); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors border"
            style={{
              ...labelCapsStyle,
              backgroundColor: missingOnly ? 'var(--color-on-primary-fixed-variant)' : 'var(--color-surface-container-highest)',
              color: missingOnly ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)',
              borderColor: missingOnly ? 'var(--color-on-primary-fixed-variant)' : 'var(--color-outline-variant)',
            }}>
            Has empty fields
            {missingOnly && <X size={12} />}
          </button>
          <span className="text-on-surface-variant ml-auto" style={bodySmStyle}>{filtered.length} routes</span>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-high border-b border-outline-variant">
              <tr>
                <th style={{ padding: '8px 12px', width: '40px' }}>
                  <input type="checkbox"
                    checked={selected.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                    className="accent-on-primary-fixed-variant w-4 h-4" />
                </th>
                {[
                  { label: 'ID' },
                  { label: 'Name' },
                  { label: 'Type', align: 'center' as const },
                  { label: 'Class' },
                  { label: 'Difficulty', align: 'center' as const },
                  { label: 'Distance', align: 'right' as const },
                  { label: 'Gain',     align: 'right' as const },
                  { label: 'Duration', align: 'right' as const },
                  { label: 'Season',   align: 'center' as const },
                  { label: 'Trail',    align: 'center' as const },
                  { label: 'Workflow', align: 'center' as const },
                  { label: '',         align: 'right' as const },
                ].map((h, i) => (
                  <th key={i}
                    className="text-on-primary-fixed-variant uppercase"
                    style={{ ...labelCapsStyle, padding: '8px 12px', textAlign: h.align ?? 'left' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {paged.map(route => {
                const season = formatSeason(route);
                const duration = formatDuration(route);
                return (
                  <tr key={route.id} className="hover:bg-surface-container-highest transition-colors group">
                    <td style={{ padding: '8px 12px' }}>
                      <input type="checkbox"
                        checked={selected.has(route.id)}
                        onChange={() => toggleSelect(route.id)}
                        className="accent-on-primary-fixed-variant w-4 h-4" />
                    </td>
                    <td className="text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      RT-{route.id}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <Link href={`/routes/${route.id}`}
                        className="text-on-surface hover:text-primary hover:underline block"
                        style={bodySmBoldStyle}>
                        {route.name}
                      </Link>
                      {route.name_dz && (
                        <div className="text-on-surface-variant truncate" style={{ fontSize: '10px', lineHeight: '14px' }}>{route.name_dz}</div>
                      )}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <EnumChip value={route.type} map={TYPE} />
                    </td>
                    <td className="text-on-surface-variant" style={{ padding: '8px 12px', ...bodySmStyle }}>
                      {route.class ?? '—'}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <EnumChip value={route.difficulty} map={DIFFICULTY} />
                    </td>
                    <td className="text-right text-on-surface" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {route.distance_km ? `${route.distance_km.toFixed(1)} km` : <NotSet />}
                    </td>
                    <td className="text-right text-on-surface" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {route.elevation_gain_m ? `${route.elevation_gain_m.toLocaleString()} m` : '—'}
                    </td>
                    <td className="text-right text-on-surface" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {duration ?? <NotSet />}
                    </td>
                    <td className="text-center text-on-surface" style={{ padding: '8px 12px', ...bodySmStyle }}>
                      {season ?? <NotSet />}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <EnumChip value={route.status} map={TRAIL_STATUS} size="sm" />
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <EnumChip value={route.content_status} map={CONTENT_STATUS} size="sm" />
                    </td>
                    <td className="text-right" style={{ padding: '8px 12px' }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary opacity-0 group-hover:opacity-100 transition">
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem><Link href={`/routes/${route.id}`} className="w-full">View &amp; edit →</Link></DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={13} className="text-center py-12 text-on-surface-variant" style={bodySmStyle}>
                  No routes match your filters
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-outline-variant bg-surface-container-low">
          <span className="text-on-surface-variant" style={bodySmStyle}>
            {filtered.length === 0
              ? 'No results'
              : `Showing ${startIdx.toLocaleString()} to ${endIdx.toLocaleString()} of ${filtered.length.toLocaleString()} entries`}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const active = i === page;
              return (
                <button key={i} onClick={() => setPage(i)}
                  className="px-3 py-1 rounded transition"
                  style={{
                    ...bodySmStyle,
                    backgroundColor: active ? 'var(--color-on-primary-fixed-variant)' : 'transparent',
                    color:           active ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)',
                    border: active ? 'none' : '1px solid var(--color-outline-variant)',
                    fontWeight: active ? 700 : 400,
                  }}>
                  {i + 1}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-on-surface-variant px-1" style={bodySmStyle}>…{totalPages}</span>}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions — spec: dark anchored pill */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-5 px-6 py-3 rounded-full shadow-2xl z-50 border bg-primary-container border-on-primary-fixed-variant">
          <div className="flex items-center gap-2 border-r border-on-primary-fixed-variant pr-5">
            <span className="text-tertiary-fixed font-bold" style={bodySmStyle}>{selected.size}</span>
            <span className="text-on-primary-container" style={bodySmStyle}>selected</span>
          </div>
          <button className="flex items-center gap-2 text-on-primary-container hover:text-tertiary-fixed transition-colors" style={bodySmStyle}>
            <SlidersHorizontal size={15} /> Set difficulty
          </button>
          <button className="flex items-center gap-2 text-on-primary-container hover:text-tertiary-fixed transition-colors" style={bodySmStyle}>
            <PencilLine size={15} /> Set season
          </button>
          <button onClick={() => setSelected(new Set())}
            className="flex items-center gap-1 text-tertiary-fixed font-bold hover:underline" style={bodySmStyle}>
            <X size={14} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
