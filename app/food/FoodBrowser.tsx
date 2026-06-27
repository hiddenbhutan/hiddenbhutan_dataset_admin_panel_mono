'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  CuisineItem,
  CuisineCategory,
  CuisineStatusCounts,
  SpiceLevel,
} from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Flame, Search, Crown, Sparkles } from 'lucide-react';

const SPICE_OPTS: { value: SpiceLevel; label: string; bg: string; color: string }[] = [
  { value: 'none',         label: 'None',         bg: '#f3ede2', color: '#424844' },
  { value: 'mild',         label: 'Mild',         bg: '#c9ead6', color: '#032014' },
  { value: 'medium',       label: 'Medium',       bg: '#fdefd8', color: '#7a4a10' },
  { value: 'hot',          label: 'Hot',          bg: '#ffdad6', color: '#93000a' },
  { value: 'eye_watering', label: 'Eye-watering', bg: '#ffdad6', color: '#52001a' },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

function dietaryBadges(item: CuisineItem): { label: string; bg: string; color: string }[] {
  const out: { label: string; bg: string; color: string }[] = [];
  if (item.is_vegan)
    out.push({ label: 'Vegan',   bg: '#c9ead6', color: '#032014' });
  else if (item.is_vegetarian)
    out.push({ label: 'Veg',     bg: '#dae69f', color: '#5d682e' });
  if (item.contains_dairy)   out.push({ label: 'Dairy',   bg: '#fdefd8', color: '#7a4a10' });
  if (item.contains_pork)    out.push({ label: 'Pork',    bg: '#ffdad6', color: '#93000a' });
  if (item.contains_beef)    out.push({ label: 'Beef',    bg: '#f8ddd4', color: '#6b2a14' });
  if (item.contains_chicken) out.push({ label: 'Chicken', bg: '#fdefd8', color: '#7a4a10' });
  if (item.contains_alcohol) out.push({ label: 'Alcohol', bg: '#e6dff0', color: '#4a3370' });
  return out;
}

export default function FoodBrowser({
  items,
  categories,
  statusCounts,
}: {
  items: CuisineItem[];
  categories: CuisineCategory[];
  statusCounts: CuisineStatusCounts;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [spiceFilter, setSpiceFilter] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [nationalOnly, setNationalOnly] = useState(false);
  const [ceremonialOnly, setCeremonialOnly] = useState(false);

  const filtered = useMemo(() => items.filter(it => {
    if (statusFilter !== 'all' && it.content_status !== statusFilter) return false;
    if (categoryFilter !== 'all' && it.category_code !== categoryFilter) return false;
    if (spiceFilter !== 'all' && it.spice_level !== spiceFilter) return false;
    if (vegOnly && !it.is_vegetarian) return false;
    if (veganOnly && !it.is_vegan) return false;
    if (nationalOnly && !it.is_national_dish) return false;
    if (ceremonialOnly && !it.is_ceremonial) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!it.name_en.toLowerCase().includes(q) &&
          !(it.name_dz ?? '').toLowerCase().includes(q) &&
          !(it.name_romanized ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, statusFilter, categoryFilter, spiceFilter, vegOnly, veganOnly, nationalOnly, ceremonialOnly, search]);

  // Group by category for display.
  const grouped = useMemo(() => {
    const m = new Map<string, { label: string; items: CuisineItem[] }>();
    filtered.forEach(it => {
      const key = it.category_code ?? '__uncategorized';
      const label = it.category_label ?? 'Uncategorized';
      if (!m.has(key)) m.set(key, { label, items: [] });
      m.get(key)!.items.push(it);
    });
    return m;
  }, [filtered]);

  const statusPills: Array<{ key: string; label: string; count: number }> = [
    { key: 'all',       label: 'All',       count: statusCounts.total },
    { key: 'draft',     label: 'Draft',     count: statusCounts.draft },
    { key: 'in_review', label: 'In review', count: statusCounts.in_review },
    { key: 'published', label: 'Published', count: statusCounts.published },
    { key: 'archived',  label: 'Archived',  count: statusCounts.archived },
  ];

  return (
    <div className="space-y-5">
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
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Category</p>
            <Select value={categoryFilter} onValueChange={v => { if (v) setCategoryFilter(v); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.code ?? String(c.id)}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Spice</p>
            <Select value={spiceFilter} onValueChange={v => { if (v) setSpiceFilter(v); }}>
              <SelectTrigger className="w-full h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm"><SelectValue placeholder="Spice" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All spice</SelectItem>
                {SPICE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <p className="text-on-surface-variant uppercase mb-2" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search dishes…"
                className="pl-9 h-9 border border-outline-variant rounded-lg bg-surface-container-highest text-sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-outline-variant">
          {[
            { label: 'Vegetarian', state: vegOnly,        set: setVegOnly },
            { label: 'Vegan',      state: veganOnly,      set: setVeganOnly },
            { label: 'National dish', state: nationalOnly, set: setNationalOnly },
            { label: 'Ceremonial', state: ceremonialOnly, set: setCeremonialOnly },
          ].map(({ label, state, set }) => (
            <div key={label} className="flex items-center gap-2">
              <Switch checked={state} onCheckedChange={set} className="data-[state=checked]:bg-on-primary-fixed-variant" />
              <span className="text-on-surface-variant" style={{ fontSize: '13px' }}>{label}</span>
            </div>
          ))}
          <span className="text-on-surface-variant ml-auto" style={{ fontSize: '13px' }}>{filtered.length} items</span>
        </div>
      </div>

      {[...grouped.entries()].map(([key, { label, items: grpItems }]) => (
        <div key={key}>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded font-bold uppercase bg-on-primary-fixed-variant text-tertiary-fixed" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>{label}</span>
            <span className="text-outline" style={{ fontSize: '13px' }}>{grpItems.length} item{grpItems.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {grpItems.map(food => {
              const spice = SPICE_OPTS.find(s => s.value === food.spice_level) ?? SPICE_OPTS[2];
              const cs = STATUS_BADGE[food.content_status] ?? STATUS_BADGE.draft;
              const badges = dietaryBadges(food);
              return (
                <Link key={food.id} href={`/food/${food.id}`}>
                  <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {food.spice_level !== 'none' && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: spice.bg, color: spice.color, fontSize: '10px' }}>
                                <Flame size={9} /> {spice.label}
                              </span>
                            )}
                            {badges.map(b => (
                              <span key={b.label} className="px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: b.bg, color: b.color, fontSize: '10px' }}>{b.label}</span>
                            ))}
                            {food.is_national_dish ? (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                                <Crown size={9} /> National
                              </span>
                            ) : null}
                            {food.is_ceremonial ? (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#e6dff0', color: '#4a3370', fontSize: '10px' }}>
                                <Sparkles size={9} /> Ceremonial
                              </span>
                            ) : null}
                          </div>
                          <p className="font-bold text-on-surface truncate" style={{ fontSize: '15px' }}>{food.name_en}</p>
                          {(food.name_dz || food.name_romanized) && (
                            <p className="italic text-outline" style={{ fontSize: '12px' }}>
                              {[food.name_dz, food.name_romanized].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {(food.short_summary || food.description) && (
                        <p className="text-on-surface-variant leading-relaxed mb-3" style={{ fontSize: '13px' }}>
                          {(food.short_summary ?? food.description ?? '').slice(0, 140)}
                          {(food.short_summary ?? food.description ?? '').length > 140 ? '…' : ''}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant" style={{ fontSize: '11px' }}>
                        <div className="flex items-center gap-2 text-outline">
                          <span>{food.ingredient_count} ingredient{food.ingredient_count === 1 ? '' : 's'}</span>
                          {food.location_count > 0 && <span>· {food.location_count} loc.</span>}
                          {food.region_dzongkhag_name && <span>· {food.region_dzongkhag_name}</span>}
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '9px' }}>{cs.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-outline" style={{ fontSize: '14px' }}>
          No items match these filters.
        </Card>
      )}
    </div>
  );
}
