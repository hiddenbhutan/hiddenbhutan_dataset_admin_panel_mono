'use client';

import { useState, useMemo } from 'react';
import type { HeritageSite, HeritageStatusCounts } from '@/lib/db';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

// Typography helpers — matching the design spec.
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const bodySmBoldStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, lineHeight: '18px' };
const dataMonoStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 400, lineHeight: '16px', fontFamily: 'JetBrains Mono, monospace',
};

const ACCESS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  open:       { label: 'Open',       bg: '#c9ead6', color: '#1a4d2a' },
  restricted: { label: 'Restricted', bg: '#fdefd8', color: '#7a4a10' },
  closed:     { label: 'Closed',     bg: '#ffdad6', color: '#93000a' },
  unknown:    { label: 'Unknown',    bg: '#e8e2d7', color: '#727973' },
};

const CONS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  registered_protected:   { label: 'Protected',     bg: '#c9ead6', color: '#1a4d2a' },
  registered_unprotected: { label: 'Registered',    bg: '#d6e8f0', color: '#2c5a70' },
  unregistered:           { label: 'Unregistered',  bg: '#e8e2d7', color: '#424844' },
  restored:               { label: 'Restored',      bg: '#dae69f', color: '#5d682e' },
  ruins:                  { label: 'Ruins',         bg: '#ffe0c0', color: '#8a3a00' },
  lost:                   { label: 'Lost',          bg: '#ffdad6', color: '#93000a' },
  unknown:                { label: 'Unknown',       bg: '#e8e2d7', color: '#727973' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

function Chip({ label, bg, color, size = 'md' }: { label: string; bg: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-block rounded-full uppercase" style={{
      ...labelCapsStyle,
      fontSize: size === 'sm' ? '10px' : '11px',
      padding: '2px 8px',
      backgroundColor: bg,
      color,
    }}>{label}</span>
  );
}

export default function HeritageClient({ sites, types, statusCounts, districts }: {
  sites: HeritageSite[];
  types: { type: string; label: string; count: number }[];
  statusCounts: HeritageStatusCounts;
  districts: string[];
}) {
  const [search, setSearch] = useState('');
  const [distFilter, setDistFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [contentStatusFilter, setContentStatusFilter] = useState<string>('all');
  const [trailOnly, setTrailOnly] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => sites.filter(s => {
    if (distFilter !== 'All' && s.district !== distFilter) return false;
    if (typeFilter !== 'All' && s.type_code !== typeFilter) return false;
    if (contentStatusFilter !== 'all' && s.content_status !== contentStatusFilter) return false;
    if (trailOnly && !s.is_accessible_from_trail) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [sites, distFilter, typeFilter, contentStatusFilter, trailOnly, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const statusPills: Array<{ key: string; label: string; count: number }> = [
    { key: 'all',       label: 'All',       count: statusCounts.total },
    { key: 'draft',     label: 'Draft',     count: statusCounts.draft },
    { key: 'in_review', label: 'In review', count: statusCounts.in_review },
    { key: 'published', label: 'Published', count: statusCounts.published },
    { key: 'archived',  label: 'Archived',  count: statusCounts.archived },
  ];

  const startIdx = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-4">
      {/* Filter card */}
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
                      ...bodySmStyle, flex: 1,
                      backgroundColor: active ? 'var(--color-on-primary-fixed-variant)' : 'transparent',
                      color:           active ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)',
                      fontWeight: active ? 700 : 600,
                    }}>
                    <span className="truncate">{p.label}</span>
                    <span style={{ ...dataMonoStyle, opacity: 0.7 }}>{p.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>District</p>
            <Select value={distFilter} onValueChange={v => { if (v) { setDistFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest" style={bodySmStyle}>
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All districts</SelectItem>
                {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Type</p>
            <Select value={typeFilter} onValueChange={v => { if (v) { setTypeFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest" style={bodySmStyle}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All types</SelectItem>
                {types.map(t => <SelectItem key={t.type} value={t.type}>{t.label} ({t.count})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search sites…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest"
                style={bodySmStyle} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            <Switch checked={trailOnly} onCheckedChange={v => { setTrailOnly(v); setPage(0); }}
              className="data-[state=checked]:bg-on-primary-fixed-variant" />
            <span className="text-on-surface-variant" style={bodySmStyle}>Trail-accessible only</span>
          </div>
          <span className="text-on-surface-variant ml-auto" style={bodySmStyle}>{filtered.length} sites</span>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-high border-b border-outline-variant">
              <tr>
                {[
                  { label: 'ID' },
                  { label: 'Name' },
                  { label: 'Type' },
                  { label: 'District / Gewog' },
                  { label: 'Built',         align: 'right' as const },
                  { label: 'Elev.',         align: 'right' as const },
                  { label: 'Conservation',  align: 'center' as const },
                  { label: 'Access',        align: 'center' as const },
                  { label: 'Trail',         align: 'center' as const },
                  { label: 'Workflow',      align: 'center' as const },
                  { label: '',              align: 'right' as const },
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
              {paged.map(site => {
                const cs = CONTENT_STATUS[site.content_status] ?? CONTENT_STATUS.draft;
                const acc = site.access_status ? ACCESS_BADGE[site.access_status] : null;
                const cons = site.conservation_status ? CONS_BADGE[site.conservation_status] : null;
                return (
                  <tr key={site.id} className="hover:bg-surface-container-highest transition-colors group">
                    <td className="text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      HS-{site.id}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <Link href={`/heritage/${site.id}`}
                        className="text-on-surface hover:text-primary hover:underline block"
                        style={bodySmBoldStyle}>
                        {site.name}
                      </Link>
                      {site.name_dz && (
                        <div className="text-on-surface-variant" style={{ fontSize: '10px', lineHeight: '14px' }}>{site.name_dz}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className="inline-block rounded border border-outline-variant text-on-surface-variant uppercase"
                        style={{ ...labelCapsStyle, padding: '2px 8px' }}>
                        {site.type ?? '—'}
                      </span>
                    </td>
                    <td className="text-on-surface-variant" style={{ padding: '8px 12px', ...bodySmStyle }}>
                      {site.district || '—'}
                      {site.gewog && <span className="text-outline"> · {site.gewog}</span>}
                    </td>
                    <td className="text-right text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {site.built_year ?? (site.built_year_approx ? `~${site.built_year_approx}` : '—')}
                    </td>
                    <td className="text-right text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {site.elevation_m != null ? `${site.elevation_m.toLocaleString()} m` : '—'}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      {cons ? <Chip label={cons.label} bg={cons.bg} color={cons.color} size="sm" />
                        : <span className="text-outline-variant">—</span>}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      {acc ? <Chip label={acc.label} bg={acc.bg} color={acc.color} size="sm" />
                        : <span className="text-outline-variant">—</span>}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      {site.is_accessible_from_trail
                        ? <Chip label="Yes" bg="#c9ead6" color="#032014" size="sm" />
                        : <span className="text-outline-variant">—</span>}
                    </td>
                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <Chip label={cs.label} bg={cs.bg} color={cs.color} size="sm" />
                    </td>
                    <td className="text-right" style={{ padding: '8px 12px' }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary opacity-0 group-hover:opacity-100 transition">
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Link href={`/heritage/${site.id}`} className="w-full">View &amp; edit →</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-on-surface-variant" style={bodySmStyle}>
                  No sites match your filters
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}
