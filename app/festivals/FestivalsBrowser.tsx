'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Festival, FestivalStatusCounts, FestivalTypeOption, FestivalAudience } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, MapPin, CalendarDays, Clock, Star, ScrollText } from 'lucide-react';

const AUDIENCE_OPTS: { value: FestivalAudience | 'all'; label: string; bg: string; color: string }[] = [
  { value: 'all',              label: 'All',                  bg: '#e8e2d7', color: '#424844' },
  { value: 'open_to_all',      label: 'Open to all',          bg: '#c9ead6', color: '#1a4d2a' },
  { value: 'tourists_welcome', label: 'Tourists welcome',     bg: '#d6e8f0', color: '#2c5a70' },
  { value: 'locals_preferred', label: 'Locals preferred',     bg: '#fdefd8', color: '#7a4a10' },
  { value: 'monastic_only',    label: 'Monastic only',        bg: '#e6dff0', color: '#4a3370' },
  { value: 'closed',           label: 'Closed',               bg: '#ffdad6', color: '#93000a' },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const VENUE_KIND_LABEL: Record<string, string> = {
  dzong: 'Dzong',
  heritage_site: 'Heritage site',
  locality: 'Locality',
};

const LUNAR_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function lunarRangeLabel(f: Festival) {
  if (!f.lunar_month) return null;
  const m = `Lunar M${f.lunar_month}`;
  if (f.lunar_day_start && f.lunar_day_end && f.lunar_day_end !== f.lunar_day_start) {
    return `${m}, d${f.lunar_day_start}–${f.lunar_day_end}`;
  }
  if (f.lunar_day_start) return `${m}, d${f.lunar_day_start}`;
  return m;
}

function audienceBadge(audience: FestivalAudience) {
  return AUDIENCE_OPTS.find(a => a.value === audience) ?? AUDIENCE_OPTS[0];
}

export default function FestivalsBrowser({
  festivals,
  types,
  statusCounts,
}: {
  festivals: Festival[];
  types: FestivalTypeOption[];
  statusCounts: FestivalStatusCounts;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<FestivalAudience | 'all'>('all');
  const [lunarMonthFilter, setLunarMonthFilter] = useState<string>('all');
  const [thangkaOnly, setThangkaOnly] = useState(false);

  const filtered = useMemo(() => festivals.filter(f => {
    if (statusFilter !== 'all' && f.content_status !== statusFilter) return false;
    if (typeFilter !== 'all' && f.festival_type_code !== typeFilter) return false;
    if (audienceFilter !== 'all' && f.audience !== audienceFilter) return false;
    if (lunarMonthFilter !== 'all' && String(f.lunar_month ?? '') !== lunarMonthFilter) return false;
    if (thangkaOnly && f.thangka_display_count === 0) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!f.name.toLowerCase().includes(s) &&
          !(f.name_dz ?? '').toLowerCase().includes(s) &&
          !(f.name_local ?? '').toLowerCase().includes(s)) return false;
    }
    return true;
  }), [festivals, statusFilter, typeFilter, audienceFilter, lunarMonthFilter, thangkaOnly, search]);

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
                {types.map(t => (
                  <SelectItem key={t.id} value={t.code ?? String(t.id)}>
                    {t.label}{t.is_religious ? '' : ' (secular)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Audience</p>
            <Select value={audienceFilter} onValueChange={v => { if (v) setAudienceFilter(v as FestivalAudience | 'all'); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="Audience" /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search festivals…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-outline-variant">
          <Select value={lunarMonthFilter} onValueChange={v => { if (v) setLunarMonthFilter(v); }}>
            <SelectTrigger className="w-40 h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="Lunar month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lunar months</SelectItem>
              {LUNAR_MONTHS.map(m => <SelectItem key={m} value={String(m)}>Lunar M{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch checked={thangkaOnly} onCheckedChange={setThangkaOnly} className="data-[state=checked]:bg-on-primary-fixed-variant" />
            <span className="text-on-surface-variant" style={{ fontSize: '13px' }}>Thangka only</span>
          </div>

          <span className="text-on-surface-variant ml-auto" style={{ fontSize: '13px' }}>{filtered.length} festivals</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-5">
        {filtered.map(f => {
          const ab = audienceBadge(f.audience);
          const cs = STATUS_BADGE[f.content_status] ?? STATUS_BADGE.draft;
          const lunar = lunarRangeLabel(f);
          return (
            <Card key={f.id} className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {f.festival_type_label && (
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '10px' }}>
                          {f.festival_type_label}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: ab.bg, color: ab.color, fontSize: '10px' }}>
                        {ab.label}
                      </span>
                      {f.thangka_display_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '10px' }}>
                          <ScrollText size={10} /> {f.thangka_display_count} thangka{f.thangka_display_count > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="font-mono text-outline border border-outline-variant px-1.5 py-0.5 rounded" style={{ fontSize: '10px' }}>FS-{f.id}</span>
                      {f.slug && <span className="font-mono text-outline" style={{ fontSize: '10px' }}>/{f.slug}</span>}
                    </div>
                    <Link href={`/festivals/${f.id}`}>
                      <h3 className="font-bold text-on-surface hover:underline" style={{ fontSize: '17px' }}>{f.name}</h3>
                    </Link>
                    {(f.name_dz || f.name_romanized || f.name_local) && (
                      <p className="text-outline mt-0.5" style={{ fontSize: '12px' }}>
                        {[f.name_dz, f.name_romanized, f.name_local].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-3">
                  {f.primary_venue_name && (
                    <div className="flex items-center gap-1.5 text-on-surface-variant" style={{ fontSize: '12px' }}>
                      <MapPin size={11} className="text-on-primary-fixed-variant" />
                      <span>
                        {f.primary_venue_name}
                        {f.primary_venue_kind && (
                          <span className="text-outline"> · {VENUE_KIND_LABEL[f.primary_venue_kind]}</span>
                        )}
                        {f.primary_venue_district && (
                          <span className="text-outline"> · {f.primary_venue_district}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {lunar && (
                    <div className="flex items-center gap-1.5 text-on-surface-variant" style={{ fontSize: '12px' }}>
                      <CalendarDays size={11} className="text-on-primary-fixed-variant" /> {lunar}
                    </div>
                  )}
                  {f.duration_days != null && (
                    <div className="flex items-center gap-1.5 text-on-surface-variant" style={{ fontSize: '12px' }}>
                      <Clock size={11} className="text-on-primary-fixed-variant" /> {f.duration_days} {f.duration_days === 1 ? 'day' : 'days'}
                    </div>
                  )}
                </div>

                {f.description && (
                  <p className="text-on-surface-variant leading-relaxed mb-3" style={{ fontSize: '13px' }}>
                    {f.description.slice(0, 180)}{f.description.length > 180 ? '…' : ''}
                  </p>
                )}

                {f.significance && (
                  <div className="flex items-start gap-1.5 mb-3" style={{ fontSize: '12px' }}>
                    <Star size={11} className="text-[#c79a3a] flex-shrink-0 mt-0.5" />
                    <span className="text-on-surface-variant">
                      {f.significance.slice(0, 140)}{f.significance.length > 140 ? '…' : ''}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>
                    {cs.label}
                  </span>
                  <Link href={`/festivals/${f.id}`} className="font-semibold hover:underline" style={{ color: '#304d3e', fontSize: '13px' }}>
                    View & edit →
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="col-span-2 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-outline" style={{ fontSize: '14px' }}>
            No festivals match these filters
          </Card>
        )}
      </div>
    </div>
  );
}
