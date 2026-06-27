'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  ConservationAreaRow,
  ConservationStatusCounts,
  CorridorLinkRow,
} from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const COLORS = ['#304d3e','#5d682e','#4e7d96','#c79a3a','#8e3f22','#6f7a3e','#476554','#2d4a3e'];

export default function CorridorsBrowser({
  corridors,
  statusCounts,
}: {
  corridors: { corridor: ConservationAreaRow; links: CorridorLinkRow[] }[];
  statusCounts: ConservationStatusCounts;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => corridors.filter(({ corridor: c, links }) => {
    if (statusFilter !== 'all' && c.content_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name_en.toLowerCase().includes(q) &&
          !(c.code ?? '').toLowerCase().includes(q) &&
          !links.some(l => l.pa_name.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [corridors, statusFilter, search]);

  const statusPills: Array<{ key: string; label: string; count: number }> = [
    { key: 'all',       label: 'All',       count: statusCounts.total },
    { key: 'draft',     label: 'Draft',     count: statusCounts.draft },
    { key: 'in_review', label: 'In review', count: statusCounts.in_review },
    { key: 'published', label: 'Published', count: statusCounts.published },
    { key: 'archived',  label: 'Archived',  count: statusCounts.archived },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Workflow</p>
            <div className="flex border border-outline-variant rounded-lg overflow-hidden bg-surface-container-highest">
              {statusPills.map(p => {
                const active = statusFilter === p.key;
                return (
                  <button key={p.key} onClick={() => setStatusFilter(p.key)}
                    className="px-3 py-2 transition-colors flex items-center gap-1.5"
                    style={{
                      fontSize: '13px', flex: 1,
                      backgroundColor: active ? 'var(--color-on-primary-fixed-variant)' : 'transparent',
                      color:           active ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)',
                      fontWeight: active ? 700 : 600,
                    }}>
                    <span className="truncate">{p.label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', opacity: 0.7 }}>{p.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, code, connected PA…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm" />
            </div>
          </div>
        </div>

        <div className="flex items-center mt-4 pt-4 border-t border-outline-variant">
          <span className="text-on-surface-variant ml-auto" style={{ fontSize: '13px' }}>{filtered.length} corridors</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(({ corridor: c, links }, i) => {
          const cs = STATUS_BADGE[c.content_status] ?? STATUS_BADGE.draft;
          const color = COLORS[i % COLORS.length];
          return (
            <Link key={c.id} href={`/corridors/${c.id}`}>
              <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: color }}>
                      {c.code ?? '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface leading-tight truncate" style={{ fontSize: '14px' }}>{c.name_en}</p>
                      {c.name_dz && <p className="text-outline truncate" style={{ fontSize: '11px' }}>{c.name_dz}</p>}
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '9px' }}>{cs.label}</span>
                  </div>

                  <div className="mb-3">
                    <p className="text-outline uppercase tracking-wide mb-1.5" style={{ fontSize: '10px', fontWeight: 700 }}>
                      Connects {links.length} {links.length === 1 ? 'PA' : 'PAs'}
                    </p>
                    {links.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {links.map(l => (
                          <span key={l.id} className="px-1.5 py-0.5 rounded font-mono font-bold inline-flex items-center gap-1" style={{ backgroundColor: '#f3ede2', color: '#304d3e', fontSize: '10px' }}
                            title={l.role ? `${l.pa_name} · role: ${l.role}` : l.pa_name}>
                            {l.pa_code ?? l.pa_name}
                            {l.role && <span className="text-outline font-normal">·{l.role}</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-outline italic" style={{ fontSize: '11px' }}>No PA links yet — populate content.corridor_link.</p>
                    )}
                  </div>

                  {c.key_species_notes && (
                    <div className="mb-3">
                      <p className="text-outline uppercase tracking-wide mb-1" style={{ fontSize: '10px', fontWeight: 700 }}>Key species</p>
                      <p className="text-on-surface-variant" style={{ fontSize: '11px' }}>
                        {c.key_species_notes.slice(0, 140)}{c.key_species_notes.length > 140 ? '…' : ''}
                      </p>
                    </div>
                  )}

                  {c.description && (
                    <p className="text-on-surface-variant leading-relaxed" style={{ fontSize: '12px' }}>
                      {c.description.slice(0, 120)}{c.description.length > 120 ? '…' : ''}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-outline-variant" style={{ fontSize: '11px' }}>
                    <span className="text-outline">
                      {c.area_km2 != null ? `${c.area_km2.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²` : 'No area'}
                    </span>
                    {c.established_year && <span className="text-outline">Est. {c.established_year}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <Card className="col-span-3 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-outline" style={{ fontSize: '14px' }}>
            No corridors match these filters.
          </Card>
        )}
      </div>
    </div>
  );
}
