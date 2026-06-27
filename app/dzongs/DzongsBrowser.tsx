'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Dzong, DzongStatusCounts } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Landmark, Search, Users } from 'lucide-react';

const TYPE_OPTS: { value: NonNullable<Dzong['type']>; label: string }[] = [
  { value: 'administrative_dzong', label: 'Administrative' },
  { value: 'monastic_dzong',       label: 'Monastic' },
  { value: 'ta_dzong',             label: 'Ta dzong' },
  { value: 'historical_dzong',     label: 'Historical' },
  { value: 'other',                label: 'Other' },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const CONS_LABEL: Record<string, string> = {
  registered_protected:   'Protected',
  registered_unprotected: 'Registered',
  unregistered:           'Unregistered',
  restored:               'Restored',
  ruins:                  'Ruins',
  lost:                   'Lost',
  unknown:                'Unknown',
};

export default function DzongsBrowser({
  dzongs,
  statusCounts,
  districts,
}: {
  dzongs: Dzong[];
  statusCounts: DzongStatusCounts;
  districts: string[];
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => dzongs.filter(d => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (districtFilter !== 'all' && d.district !== districtFilter) return false;
    if (statusFilter !== 'all' && d.content_status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!d.name.toLowerCase().includes(s) && !(d.name_dz ?? '').toLowerCase().includes(s)) return false;
    }
    return true;
  }), [dzongs, typeFilter, districtFilter, statusFilter, search]);

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
          <div className="col-span-12 lg:col-span-5">
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

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Type</p>
            <Select value={typeFilter} onValueChange={v => { if (v) setTypeFilter(v); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>District</p>
            <Select value={districtFilter} onValueChange={v => { if (v) setDistrictFilter(v); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="District" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search dzongs…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm" />
            </div>
          </div>
        </div>

        <div className="flex items-center mt-4 pt-4 border-t border-outline-variant">
          <span className="text-on-surface-variant ml-auto" style={{ fontSize: '13px' }}>{filtered.length} dzongs</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(d => {
          const cs = STATUS_BADGE[d.content_status] ?? STATUS_BADGE.draft;
          const typeLabel = TYPE_OPTS.find(o => o.value === d.type)?.label ?? d.type?.replace(/_/g, ' ');
          return (
            <Link key={d.id} href={`/dzongs/${d.id}`}>
              <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-container">
                      <Landmark size={18} className="text-tertiary-fixed" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface leading-tight truncate" style={{ fontSize: '15px' }}>{d.name}</p>
                      {d.name_dz && <p className="text-outline truncate" style={{ fontSize: '11px' }}>{d.name_dz}</p>}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>{d.district || '—'}</span>
                        {typeLabel && <span className="text-outline" style={{ fontSize: '11px' }}>{typeLabel}</span>}
                      </div>
                    </div>
                    <span className="font-mono text-outline flex-shrink-0" style={{ fontSize: '11px' }}>#{d.id}</span>
                  </div>

                  {/* Operational badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {d.is_current_admin_seat ? (
                      <span className="px-1.5 py-0.5 rounded font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>Admin seat</span>
                    ) : null}
                    {d.houses_monk_body ? (
                      <span className="px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '9px' }}>
                        <Users size={9} />
                        Monk body{d.monk_body_capacity != null ? ` · ${d.monk_body_capacity}` : ''}
                      </span>
                    ) : null}
                    {d.conservation_status && d.conservation_status !== 'unknown' && (
                      <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#ede8dd', color: '#424844', fontSize: '9px' }}>
                        {CONS_LABEL[d.conservation_status] ?? d.conservation_status}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-outline uppercase tracking-wide" style={{ fontSize: '10px' }}>Built</p>
                      <p className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>
                        {d.built_year ?? (d.built_year_approx ? `~${d.built_year_approx}` : '—')}
                      </p>
                    </div>
                    <div>
                      <p className="text-outline uppercase tracking-wide" style={{ fontSize: '10px' }}>Elevation</p>
                      <p className="font-semibold font-mono text-on-surface" style={{ fontSize: '13px' }}>
                        {d.elevation_m != null ? `${d.elevation_m.toLocaleString()} m` : '—'}
                      </p>
                    </div>
                  </div>

                  {d.built_by && (
                    <p className="text-on-surface-variant mb-2" style={{ fontSize: '12px' }}>
                      <span className="font-semibold">Built by:</span> {d.built_by}
                    </p>
                  )}

                  {d.significance && (
                    <p className="text-on-surface-variant leading-relaxed mb-2" style={{ fontSize: '12px' }}>
                      {d.significance.slice(0, 120)}{d.significance.length > 120 ? '…' : ''}
                    </p>
                  )}

                  <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                    {d.period && <span className="text-outline" style={{ fontSize: '11px' }}>{d.period}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <Card className="col-span-3 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-outline" style={{ fontSize: '14px' }}>
            No dzongs match these filters
          </Card>
        )}
      </div>
    </div>
  );
}
