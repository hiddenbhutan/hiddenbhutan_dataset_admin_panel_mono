'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  ConservationAreaRow,
  ConservationStatusCounts,
  PaType,
  IucnCategory,
} from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PA_TYPE_OPTS: { value: PaType; label: string }[] = [
  { value: 'national_park',          label: 'National park' },
  { value: 'wildlife_sanctuary',     label: 'Wildlife sanctuary' },
  { value: 'strict_nature_reserve',  label: 'Strict nature reserve' },
  { value: 'biological_corridor',    label: 'Biological corridor' },
  { value: 'ramsar_site',            label: 'Ramsar site' },
  { value: 'royal_botanical_park',   label: 'Royal botanical park' },
  { value: 'nature_reserve',         label: 'Nature reserve' },
  { value: 'other',                  label: 'Other' },
];

const IUCN_OPTS: { value: IucnCategory; label: string }[] = [
  { value: 'Ia',           label: 'Ia (strict nature reserve)' },
  { value: 'Ib',           label: 'Ib (wilderness area)' },
  { value: 'II',           label: 'II (national park)' },
  { value: 'III',          label: 'III (natural monument)' },
  { value: 'IV',           label: 'IV (habitat/species management)' },
  { value: 'V',            label: 'V (protected landscape)' },
  { value: 'VI',           label: 'VI (sustainable use)' },
  { value: 'not_assigned', label: 'Not assigned' },
];

const ACCESS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  open:       { label: 'Open',       bg: '#c9ead6', color: '#1a4d2a' },
  restricted: { label: 'Restricted', bg: '#fdefd8', color: '#7a4a10' },
  closed:     { label: 'Closed',     bg: '#ffdad6', color: '#93000a' },
  unknown:    { label: 'Unknown',    bg: '#e8e2d7', color: '#727973' },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

export default function ConservationBrowser({
  areas,
  statusCounts,
}: {
  areas: ConservationAreaRow[];
  statusCounts: ConservationStatusCounts;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [iucnFilter, setIucnFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [permitOnly, setPermitOnly] = useState(false);

  const filtered = useMemo(() => areas.filter(a => {
    if (statusFilter !== 'all' && a.content_status !== statusFilter) return false;
    if (typeFilter   !== 'all' && a.pa_type        !== typeFilter)   return false;
    if (iucnFilter   !== 'all' && a.iucn_category  !== iucnFilter)   return false;
    if (accessFilter !== 'all' && a.access_status  !== accessFilter) return false;
    if (activeOnly && !a.is_active)           return false;
    if (permitOnly && !a.permit_required)     return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.name_en.toLowerCase().includes(q) &&
          !(a.name_dz ?? '').toLowerCase().includes(q) &&
          !(a.code ?? '').toLowerCase().includes(q) &&
          !(a.pa_name ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [areas, statusFilter, typeFilter, iucnFilter, accessFilter, activeOnly, permitOnly, search]);

  const statusPills: Array<{ key: string; label: string; count: number }> = [
    { key: 'all',       label: 'All',       count: statusCounts.pa_total },
    { key: 'draft',     label: 'Draft',     count: statusCounts.draft },
    { key: 'in_review', label: 'In review', count: statusCounts.in_review },
    { key: 'published', label: 'Published', count: statusCounts.published },
    { key: 'archived',  label: 'Archived',  count: statusCounts.archived },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 lg:col-span-4">
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

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>PA type</p>
            <Select value={typeFilter} onValueChange={v => { if (v) setTypeFilter(v); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="PA type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PA types</SelectItem>
                {PA_TYPE_OPTS.filter(o => o.value !== 'biological_corridor').map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>IUCN</p>
            <Select value={iucnFilter} onValueChange={v => { if (v) setIucnFilter(v); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="IUCN" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All IUCN</SelectItem>
                {IUCN_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, code…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} className="data-[state=checked]:bg-on-primary-fixed-variant" />
            <span className="text-on-surface-variant" style={{ fontSize: '13px' }}>Active only</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={permitOnly} onCheckedChange={setPermitOnly} className="data-[state=checked]:bg-on-primary-fixed-variant" />
            <span className="text-on-surface-variant" style={{ fontSize: '13px' }}>Permit required</span>
          </div>
          <span className="text-on-surface-variant ml-auto" style={{ fontSize: '13px' }}>{filtered.length} areas</span>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high">
              <tr className="border-b border-outline-variant">
                {['Code', 'Name', 'Type', 'IUCN', 'Area', 'Established', 'Access', 'Permit', 'Mgmt zones', 'Workflow', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map(a => {
                const access = ACCESS_BADGE[a.access_status];
                const cs = STATUS_BADGE[a.content_status] ?? STATUS_BADGE.draft;
                return (
                  <tr key={a.id} className="hover:bg-surface-container-highest transition-colors">
                    <td className="px-3 py-2 font-mono text-on-primary-fixed-variant font-bold" style={{ fontSize: '12px' }}>{a.code ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Link href={`/conservation/${a.id}`} className="font-semibold text-on-primary-fixed-variant hover:underline" style={{ fontSize: '13px' }}>
                        {a.name_en}
                      </Link>
                      {a.name_dz && <p className="text-outline" style={{ fontSize: '11px' }}>{a.name_dz}</p>}
                      {!a.is_active && <span className="px-1 py-0.5 rounded uppercase font-bold mt-0.5 inline-block" style={{ backgroundColor: '#e8d6d6', color: '#7a1a1a', fontSize: '9px', letterSpacing: '0.05em' }}>Inactive</span>}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant" style={{ fontSize: '12px' }}>{a.pa_type_label}</td>
                    <td className="px-3 py-2 font-mono text-on-surface-variant" style={{ fontSize: '11px' }}>{a.iucn_category === 'not_assigned' ? '—' : a.iucn_category}</td>
                    <td className="px-3 py-2 font-mono text-on-surface-variant" style={{ fontSize: '12px' }}>
                      {a.area_km2 != null ? `${a.area_km2.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²` : '—'}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant" style={{ fontSize: '12px' }}>{a.established_year ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: access.bg, color: access.color, fontSize: '10px' }}>{access.label}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {a.permit_required ? (
                        <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '10px' }}>Yes</span>
                      ) : <span className="text-outline-variant" style={{ fontSize: '12px' }}>—</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-on-surface-variant text-center" style={{ fontSize: '12px' }}>{a.zone_count}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant"><MoreHorizontal size={15} /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Link href={`/conservation/${a.id}`} className="w-full">View &amp; edit →</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-outline" style={{ fontSize: '14px' }}>No areas match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
