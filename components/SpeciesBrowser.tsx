'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Species, SpeciesStatusCounts, IucnStatus, NationalSpeciesRole, SpeciesKingdom } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, ChevronLeft, ChevronRight, Crown, Star, MoreVertical } from 'lucide-react';

const PAGE_SIZE = 50;

// Conservation-status color semantics — kept as inline hex because they're a
// shared semantic palette across the app (used in detail pages too) and don't
// map cleanly onto the parchment/forest tokens.
export const IUCN_OPTS: { value: IucnStatus; label: string; bg: string; color: string; border: string }[] = [
  { value: 'EX', label: 'EX', bg: '#52001a', color: '#fff',    border: '#52001a' },
  { value: 'EW', label: 'EW', bg: '#7a1a2a', color: '#fff',    border: '#7a1a2a' },
  { value: 'CR', label: 'CR', bg: '#ffdad6', color: '#93000a', border: '#ba1a1a' },
  { value: 'EN', label: 'EN', bg: '#f8ddd4', color: '#6b2a14', border: '#6b2a14' },
  { value: 'VU', label: 'VU', bg: '#fdefd8', color: '#7a4a10', border: '#c79a3a' },
  { value: 'NT', label: 'NT', bg: '#d6e8f0', color: '#2c5a70', border: '#2c5a70' },
  { value: 'LC', label: 'LC', bg: '#dae69f', color: '#5d682e', border: '#59632a' },
  { value: 'DD', label: 'DD', bg: '#e8e2d7', color: '#424844', border: '#c2c8c2' },
  { value: 'NE', label: 'NE', bg: '#ede8dd', color: '#727973', border: '#c2c8c2' },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const NATIONAL_ROLE_LABEL: Record<NationalSpeciesRole, string> = {
  national_animal: 'National animal',
  national_bird:   'National bird',
  national_flower: 'National flower',
  national_tree:   'National tree',
};

// label-caps utility: 11px / 700 / 0.05em / uppercase
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  lineHeight: '16px',
};

// body-sm utility: 13px / 400 / 18px
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };

// data-mono utility: 12px / mono
const dataMonoStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 400, lineHeight: '16px', fontFamily: 'JetBrains Mono, monospace' };

const KINGDOM_OPTS: { value: SpeciesKingdom; label: string }[] = [
  { value: 'animalia',  label: 'Animals' },
  { value: 'plantae',   label: 'Plants' },
  { value: 'fungi',     label: 'Fungi' },
  { value: 'chromista', label: 'Chromista' },
  { value: 'protozoa',  label: 'Protozoa' },
  { value: 'bacteria',  label: 'Bacteria' },
  { value: 'archaea',   label: 'Archaea' },
];

export default function SpeciesBrowser({
  species,
  statusCounts,
  families,
  detailHref,
  showFamilyColumn = true,
  showElevationColumn = true,
  showKingdomFilter = false,
  classOptions,
}: {
  species: Species[];
  statusCounts: SpeciesStatusCounts;
  families: string[];
  /** e.g. `/species` — detail link is `${detailHref}/${id}`. */
  detailHref: string;
  showFamilyColumn?: boolean;
  /** Birds have attributes.elevation_min/max_m; mammals usually don't. */
  showElevationColumn?: boolean;
  /** When true, surface kingdom + class dropdowns for the unified species browser. */
  showKingdomFilter?: boolean;
  /** Available class values for the class dropdown (with counts). */
  classOptions?: Array<{ class: string; count: number }>;
}) {
  const [search, setSearch] = useState('');
  const [iucnFilter, setIucnFilter] = useState<Set<IucnStatus>>(new Set());
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kingdomFilter, setKingdomFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [endemicOnly, setEndemicOnly] = useState(false);
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => species.filter(s => {
    if (statusFilter !== 'all' && s.content_status !== statusFilter) return false;
    if (kingdomFilter !== 'all' && s.kingdom !== kingdomFilter) return false;
    if (classFilter !== 'all' && s.class !== classFilter) return false;
    if (iucnFilter.size > 0 && !iucnFilter.has(s.conservation_status_iucn)) return false;
    if (familyFilter !== 'all' && s.family !== familyFilter) return false;
    if (endemicOnly && !s.is_endemic_to_bhutan && !s.is_endemic_to_himalaya) return false;
    if (curatedOnly && !s.is_curated) return false;
    if (search) {
      const q = search.toLowerCase();
      const inCommon = (s.common_name_en ?? '').toLowerCase().includes(q);
      const inSci    = s.scientific_name.toLowerCase().includes(q);
      const inDz     = (s.common_name_dz ?? '').toLowerCase().includes(q);
      if (!inCommon && !inSci && !inDz) return false;
    }
    return true;
  }), [species, iucnFilter, familyFilter, statusFilter, kingdomFilter, classFilter, endemicOnly, curatedOnly, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleIucn(s: IucnStatus) {
    setIucnFilter(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
    setPage(0);
  }

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
      {/* Filter card — spec: surface-container-low / outline-variant / rounded-xl */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className="grid grid-cols-12 gap-4 items-end">
          {/* IUCN section: label + chip row */}
          <div className="col-span-12 lg:col-span-6">
            <p className="text-on-surface-variant uppercase mb-3" style={labelCapsStyle}>
              Conservation Status (IUCN)
            </p>
            <div className="flex flex-wrap gap-2">
              {IUCN_OPTS.map(opt => {
                const active = iucnFilter.has(opt.value);
                const count = statusCounts.iucn[opt.value];
                return (
                  <button key={opt.value} onClick={() => toggleIucn(opt.value)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all"
                    style={{
                      ...labelCapsStyle,
                      backgroundColor: active ? opt.bg : 'var(--color-surface-container-high)',
                      color:           active ? opt.color : 'var(--color-on-surface-variant)',
                      borderColor:     active ? opt.border : 'var(--color-outline-variant)',
                    }}>
                    {opt.label}
                    <span className="opacity-60" style={{ fontSize: '9px' }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workflow status pills */}
          <div className="col-span-12 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Workflow</p>
            <div className="flex border border-outline-variant rounded-lg overflow-hidden bg-surface-container-highest">
              {statusPills.map(p => {
                const active = statusFilter === p.key;
                return (
                  <button key={p.key} onClick={() => { setStatusFilter(p.key); setPage(0); }}
                    className="px-2.5 py-2 transition-colors flex items-center gap-1"
                    style={{
                      ...bodySmStyle,
                      flex: 1,
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

          {/* Family + flags + search */}
          <div className="col-span-12 lg:col-span-3 space-y-2">
            <p className="text-on-surface-variant uppercase mb-2" style={labelCapsStyle}>Family</p>
            {showFamilyColumn && families.length > 0 ? (
              <Select value={familyFilter} onValueChange={v => { if (v) { setFamilyFilter(v); setPage(0); } }}>
                <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-on-surface" style={bodySmStyle}>
                  <SelectValue placeholder="All families" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All families</SelectItem>
                  {families.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : <div className="h-9" />}
          </div>
        </div>

        {/* Toggles + kingdom/class + search row */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-outline-variant">
          {showKingdomFilter && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant uppercase" style={labelCapsStyle}>Kingdom</span>
                <Select value={kingdomFilter} onValueChange={v => { if (v) { setKingdomFilter(v); setClassFilter('all'); setPage(0); } }}>
                  <SelectTrigger className="w-36 h-8 border border-outline-variant rounded-lg bg-surface-container-highest text-on-surface" style={bodySmStyle}>
                    <SelectValue placeholder="All kingdoms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All kingdoms</SelectItem>
                    {KINGDOM_OPTS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {classOptions && classOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant uppercase" style={labelCapsStyle}>Class</span>
                  <Select value={classFilter} onValueChange={v => { if (v) { setClassFilter(v); setPage(0); } }}>
                    <SelectTrigger className="w-40 h-8 border border-outline-variant rounded-lg bg-surface-container-highest text-on-surface" style={bodySmStyle}>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {classOptions.map(c => <SelectItem key={c.class} value={c.class}>{c.class} ({c.count})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={endemicOnly} onCheckedChange={v => { setEndemicOnly(v); setPage(0); }}
              className="data-[state=checked]:bg-on-primary-fixed-variant" />
            <span className="text-on-surface-variant" style={bodySmStyle}>Endemic only</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={curatedOnly} onCheckedChange={v => { setCuratedOnly(v); setPage(0); }}
              className="data-[state=checked]:bg-on-primary-fixed-variant" />
            <span className="text-on-surface-variant" style={bodySmStyle}>Curated only</span>
          </div>

          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Common, scientific, Dz name…"
              className="pl-9 h-9 w-72 border border-outline-variant rounded-lg bg-surface-container-highest"
              style={bodySmStyle} />
          </div>
          <span className="text-on-surface-variant" style={bodySmStyle}>{filtered.length} species</span>
        </div>
      </div>

      {/* Data table — spec: surface-container-low / outline-variant / rounded-xl */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-high border-b border-outline-variant">
              <tr>
                {[
                  { label: 'Common Name (En / Dz)' },
                  { label: 'Scientific Name' },
                  ...(showFamilyColumn ? [{ label: 'Family' }] : []),
                  { label: 'IUCN',     align: 'center' as const },
                  { label: 'BT',       align: 'center' as const },
                  ...(showElevationColumn ? [{ label: 'Elevation', align: 'right' as const }] : []),
                  { label: 'Flags',    align: 'center' as const },
                  { label: 'Aliases',  align: 'center' as const },
                  { label: 'Locs',     align: 'center' as const },
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
              {paged.map(s => {
                const iucn = IUCN_OPTS.find(o => o.value === s.conservation_status_iucn) ?? IUCN_OPTS[8];
                const bt   = IUCN_OPTS.find(o => o.value === s.conservation_status_bhutan) ?? IUCN_OPTS[8];
                const cs   = STATUS_BADGE[s.content_status] ?? STATUS_BADGE.draft;
                const elevMin = s.attributes?.elevation_min_m;
                const elevMax = s.attributes?.elevation_max_m;
                const displayName = s.common_name_en ?? s.scientific_name;
                return (
                  <tr key={s.id} className="hover:bg-surface-container-highest transition-colors group">
                    {/* Common name column — spec includes a thumbnail + EN + Dz stack */}
                    <td style={{ padding: '8px 12px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-outline-variant flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {s.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.thumbnail_url} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-on-surface-variant" style={{ fontSize: '11px', fontWeight: 700 }}>
                              {displayName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`${detailHref}/${s.id}`} className="font-bold text-on-surface hover:underline block truncate" style={bodySmStyle}>
                            {displayName}
                          </Link>
                          {s.common_name_dz && (
                            <div className="text-on-surface-variant truncate" style={{ fontSize: '10px', lineHeight: '14px' }}>{s.common_name_dz}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="italic text-on-surface-variant" style={{ padding: '8px 12px', ...bodySmStyle }}>
                      {s.scientific_name}
                      {s.authorship && <span className="not-italic ml-1 opacity-70">{s.authorship}</span>}
                    </td>

                    {showFamilyColumn && (
                      <td className="text-on-surface-variant" style={{ padding: '8px 12px', ...bodySmStyle }}>
                        {s.family ?? '—'}
                      </td>
                    )}

                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <span className="inline-block rounded border" style={{
                        padding: '2px 8px', ...labelCapsStyle,
                        backgroundColor: iucn.bg, color: iucn.color, borderColor: iucn.border,
                      }}>{iucn.label}</span>
                    </td>

                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <span className="inline-block rounded border" title="Bhutan-specific IUCN assessment" style={{
                        padding: '2px 8px', ...labelCapsStyle,
                        backgroundColor: bt.bg, color: bt.color, borderColor: bt.border,
                      }}>{bt.label}</span>
                    </td>

                    {showElevationColumn && (
                      <td className="text-right text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                        {elevMin != null && elevMax != null
                          ? `${elevMin.toLocaleString()} – ${elevMax.toLocaleString()} m`
                          : '—'}
                      </td>
                    )}

                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <div className="flex justify-center gap-1.5">
                        {s.national_role ? (
                          <span title={NATIONAL_ROLE_LABEL[s.national_role]} className="text-on-tertiary-container">
                            <Crown size={16} />
                          </span>
                        ) : null}
                        {s.is_endemic_to_bhutan ? (
                          <span title="Endemic to Bhutan" className="text-on-primary-fixed-variant">
                            <Star size={16} />
                          </span>
                        ) : null}
                        {s.is_endemic_to_himalaya ? (
                          <span title="Endemic to Himalaya" className="rounded border border-outline-variant text-on-surface-variant px-1"
                            style={{ ...labelCapsStyle, fontSize: '9px' }}>HE</span>
                        ) : null}
                        {!s.is_curated && (
                          <span title="GBIF checklist only — not curated"
                            className="rounded bg-surface-container-high text-on-surface-variant px-1"
                            style={{ ...labelCapsStyle, fontSize: '9px' }}>GBIF</span>
                        )}
                        {!s.national_role && !s.is_endemic_to_bhutan && !s.is_endemic_to_himalaya && s.is_curated && (
                          <span className="text-outline-variant">—</span>
                        )}
                      </div>
                    </td>

                    <td className="text-center text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {s.alias_count}
                    </td>
                    <td className="text-center text-on-surface-variant" style={{ padding: '8px 12px', ...dataMonoStyle }}>
                      {s.location_count}
                    </td>

                    <td className="text-center" style={{ padding: '8px 12px' }}>
                      <span className="inline-block rounded-full" style={{
                        padding: '2px 8px', ...labelCapsStyle,
                        backgroundColor: cs.bg, color: cs.color,
                      }}>{cs.label}</span>
                    </td>

                    <td className="text-right" style={{ padding: '8px 12px' }}>
                      <Link href={`${detailHref}/${s.id}`}
                        className="inline-flex p-1 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary opacity-0 group-hover:opacity-100 transition">
                        <MoreVertical size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-on-surface-variant" style={bodySmStyle}>
                  No species match your filters
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — spec: bg-surface-container-low / border-top / "Showing X to Y of N entries" */}
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
            {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => {
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
            {totalPages > 6 && <span className="text-on-surface-variant px-1" style={bodySmStyle}>…{totalPages}</span>}
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
