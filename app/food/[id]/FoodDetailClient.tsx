'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame, Crown, Sparkles, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import type {
  CuisineItem,
  CuisineCategory,
  CuisineItemIngredient,
  CuisineItemLocation,
  CuisineLocationRole,
  SpiceLevel,
  RefOption,
  MediaItem,
} from '@/lib/db';
import { updateCuisineItem, setCuisineItemStatus, deleteCuisineItem } from '@/lib/actions/cuisine';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import {
  StatusBadge,
  StatusActions,
  DiscardSaveButtons,
  DeleteButton,
  FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import EditableTagList from '@/components/EditableTagList';

const SPICE_OPTS: { value: SpiceLevel; label: string; bg: string; color: string }[] = [
  { value: 'none',         label: 'None',         bg: '#f3ede2', color: '#424844' },
  { value: 'mild',         label: 'Mild',         bg: '#c9ead6', color: '#032014' },
  { value: 'medium',       label: 'Medium',       bg: '#fdefd8', color: '#7a4a10' },
  { value: 'hot',          label: 'Hot',          bg: '#ffdad6', color: '#93000a' },
  { value: 'eye_watering', label: 'Eye-watering', bg: '#ffdad6', color: '#52001a' },
];

const ROLE_BADGE: Record<CuisineLocationRole, { label: string; bg: string; color: string }> = {
  origin:     { label: 'Origin',     bg: '#ffdea3', color: '#261900' },
  specialty:  { label: 'Specialty',  bg: '#dae69f', color: '#5d682e' },
  popular:    { label: 'Popular',    bg: '#d6e8f0', color: '#2c5a70' },
  seasonal:   { label: 'Seasonal',   bg: '#fdefd8', color: '#7a4a10' },
  ceremonial: { label: 'Ceremonial', bg: '#e6dff0', color: '#4a3370' },
};

// Typography helpers — design spec
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-on-surface-variant mb-1.5 block uppercase" style={labelCapsStyle}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-outline" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-outline-variant mb-4">
      <p className="text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>{title}</p>
    </div>
  );
}

export default function FoodDetailClient({
  item,
  categories,
  ingredients,
  locations,
  dzongkhags,
  media,
}: {
  item: CuisineItem;
  categories: CuisineCategory[];
  ingredients: CuisineItemIngredient[];
  locations: CuisineItemLocation[];
  dzongkhags: RefOption[];
  media: MediaItem[];
}) {
  const [data, setData] = useState({ ...item });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(item.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(item.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof CuisineItem>(key: K, value: CuisineItem[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    setDirty(true);
  }, []);

  function handleSave() {
    const patch = {
      slug:                data.slug,
      name_en:             data.name_en,
      name_dz:             data.name_dz,
      name_romanized:      data.name_romanized,
      description:         data.description,
      short_summary:       data.short_summary,
      category_id:         data.category_id,
      spice_level:         data.spice_level,
      is_vegetarian:       data.is_vegetarian,
      is_vegan:            data.is_vegan,
      contains_dairy:      data.contains_dairy,
      contains_pork:       data.contains_pork,
      contains_beef:       data.contains_beef,
      contains_chicken:    data.contains_chicken,
      contains_alcohol:    data.contains_alcohol,
      is_national_dish:    data.is_national_dish,
      is_ceremonial:       data.is_ceremonial,
      preparation:         data.preparation,
      serving_notes:       data.serving_notes,
      typical_occasions:   data.typical_occasions ? data.typical_occasions.join('\n') : null,
      history:             data.history,
      folklore:            data.folklore,
      region_dzongkhag_id: data.region_dzongkhag_id,
    };
    startTransition(async () => {
      const res = await updateCuisineItem(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name_en}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        const first = Object.entries(res.errors)[0];
        toast.error(first ? `${first[0]}: ${first[1]}` : (res.message ?? 'Please fix the highlighted fields'));
      } else if (res.conflict) {
        toast.error(res.message ?? 'Reload — someone else edited this row');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setCuisineItemStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const spice = SPICE_OPTS.find(s => s.value === data.spice_level) ?? SPICE_OPTS[2];

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <Link href="/food" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Food &amp; Drink
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.category_label && (
                <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#e8e2d7', color: '#424844', fontSize: '11px' }}>
                  {data.category_label}
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: spice.bg, color: spice.color, fontSize: '10px' }}>
                <Flame size={10} /> {spice.label}
              </span>
              {data.is_vegan ? (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#c9ead6', color: '#032014', fontSize: '10px' }}>Vegan</span>
              ) : data.is_vegetarian ? (
                <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#dae69f', color: '#5d682e', fontSize: '10px' }}>Vegetarian</span>
              ) : null}
              {data.is_national_dish ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '10px' }}>
                  <Crown size={10} /> National dish
                </span>
              ) : null}
              {data.is_ceremonial ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#e6dff0', color: '#4a3370', fontSize: '10px' }}>
                  <Sparkles size={10} /> Ceremonial
                </span>
              ) : null}
              <span className="font-mono text-outline text-sm border border-outline-variant px-2 py-0.5 rounded">FD-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {(data.name_dz || data.name_romanized) && (
              <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>
                {[data.name_dz, data.name_romanized].filter(Boolean).join(' · ')}
              </p>
            )}
            {data.short_summary && <p className="text-on-surface-variant mt-2 max-w-2xl" style={{ fontSize: '14px' }}>{data.short_summary}</p>}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons
              dirty={dirty}
              pending={pending}
              onDiscard={() => { setData({ ...item }); setDirty(false); }}
              onSave={handleSave}
            />
            <DeleteButton onDelete={() => deleteCuisineItem(data.id)}
              redirectTo="/food" entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        <div className="col-span-7 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Editorial content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <F label="Name (English)">
                    <Input value={data.name_en} onChange={e => update('name_en', e.target.value)} className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.name_en} />
                  </F>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)} className="border-outline-variant h-9 text-sm italic" />
                    </F>
                    <F label="Slug">
                      <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-outline-variant h-9 text-sm font-mono" />
                      <FieldError message={errors.slug} />
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Category">
                      <Select value={data.category_id ? String(data.category_id) : '__none'}
                        onValueChange={v => { if (v) update('category_id', v === '__none' ? null : Number(v)); }}>
                        <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Not set</SelectItem>
                          {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Region of origin">
                      <Select value={data.region_dzongkhag_id ? String(data.region_dzongkhag_id) : '__none'}
                        onValueChange={v => { if (v) update('region_dzongkhag_id', v === '__none' ? null : Number(v)); }}>
                        <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">None</SelectItem>
                          {dzongkhags.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                  </div>
                </div>
              </div>

              <div>
                <S title="Narrative" />
                <div className="space-y-3">
                  <F label="Short summary" hint="One-liner used in card listings.">
                    <Textarea value={data.short_summary ?? ''} onChange={e => update('short_summary', e.target.value || null)} rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)} rows={5} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Preparation">
                    <Textarea value={data.preparation ?? ''} onChange={e => update('preparation', e.target.value || null)} rows={4} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Serving notes">
                    <Textarea value={data.serving_notes ?? ''} onChange={e => update('serving_notes', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none"
                      placeholder="Eaten with rice / hand / at temperature…" />
                  </F>
                  <F label="History">
                    <Textarea value={data.history ?? ''} onChange={e => update('history', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Folklore">
                    <Textarea value={data.folklore ?? ''} onChange={e => update('folklore', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '14px' }}>Ingredients</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {ingredients.length === 0 ? 'No ingredients linked yet' : `${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {ingredients.length === 0 ? (
                <div className="px-5 py-6 text-center text-outline" style={{ fontSize: '12px' }}>
                  Populate content.cuisine_item_ingredient to link this dish to its ingredients.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-surface-container-high">
                    <tr className="border-b border-outline-variant">
                      {['#', 'Ingredient', 'Quantity', 'Flags'].map(h => (
                        <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '11px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {ingredients.map(i => (
                      <tr key={i.id} className="hover:bg-surface-container">
                        <td className="px-4 py-2 font-mono text-outline" style={{ fontSize: '11px' }}>{i.sort_order}</td>
                        <td className="px-4 py-2 font-semibold text-on-surface" style={{ fontSize: '13px' }}>{i.ingredient_name}</td>
                        <td className="px-4 py-2 text-on-surface-variant" style={{ fontSize: '12px' }}>{i.quantity_notes ?? '—'}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {i.is_optional ? (
                              <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '9px' }}>Optional</span>
                            ) : null}
                            {i.is_garnish ? (
                              <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#dae69f', color: '#5d682e', fontSize: '9px' }}>Garnish</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '14px', color: '#1d1c15' }}>Where from / where to try</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {locations.length === 0 ? 'No locations linked yet' : `${locations.length} location${locations.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {locations.length === 0 ? (
                <div className="px-5 py-6 text-center text-outline" style={{ fontSize: '12px' }}>
                  Populate content.cuisine_item_location (exactly one of dzongkhag/locality per row).
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {locations.map(loc => {
                    const role = ROLE_BADGE[loc.role];
                    return (
                      <li key={loc.id} className="flex items-start gap-3 px-4 py-3">
                        <MapPin size={14} className="text-on-primary-fixed-variant flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: role.bg, color: role.color, fontSize: '9px' }}>{role.label}</span>
                            <span className="font-semibold text-on-surface" style={{ fontSize: '13px' }}>{loc.name}</span>
                            <span className="px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant uppercase" style={{ fontSize: '9px' }}>
                              {loc.kind === 'dzongkhag' ? 'Dzongkhag' : 'Locality'}
                            </span>
                          </div>
                          {loc.notes && <p className="text-outline mt-0.5" style={{ fontSize: '11px' }}>{loc.notes}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityMediaPanel
                entityType="cuisine_item"
                entityId={item.id}
                items={media}
                revalidatePaths={[`/food/${item.id}`, '/media']}
              />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5 space-y-4">
          {/* Dietary + spice */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle style={{ fontSize: '16px', color: '#1d1c15' }}>Diet &amp; classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <F label="Spice level">
                <Select value={data.spice_level} onValueChange={v => { if (v) update('spice_level', v as SpiceLevel); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPICE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>

              <div className="rounded border border-[#e8e2d7] p-3 space-y-2.5">
                <p className="font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '10px' }}>Dietary</p>
                {([
                  ['is_vegetarian',    'Vegetarian'],
                  ['is_vegan',         'Vegan'],
                  ['contains_dairy',   'Contains dairy'],
                  ['contains_pork',    'Contains pork'],
                  ['contains_beef',    'Contains beef'],
                  ['contains_chicken', 'Contains chicken'],
                  ['contains_alcohol', 'Contains alcohol'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-on-surface-variant">{label}</Label>
                      <Switch checked={!!data[key]}
                        onCheckedChange={v => update(key, v ? 1 : 0)}
                        className="data-[state=checked]:bg-on-primary-fixed-variant" />
                    </div>
                    <FieldError message={errors[key]} />
                  </div>
                ))}
                <FieldError message={errors.is_vegetarian} />
              </div>

              <div className="rounded border border-[#e8e2d7] p-3 space-y-2.5">
                <p className="font-bold uppercase tracking-wider text-on-primary-fixed-variant" style={{ fontSize: '10px' }}>Specialty</p>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-on-surface-variant">National dish</Label>
                  <Switch checked={!!data.is_national_dish}
                    onCheckedChange={v => update('is_national_dish', v ? 1 : 0)}
                    className="data-[state=checked]:bg-on-primary-fixed-variant" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-on-surface-variant">Ceremonial (festivals / rituals)</Label>
                  <Switch checked={!!data.is_ceremonial}
                    onCheckedChange={v => update('is_ceremonial', v ? 1 : 0)}
                    className="data-[state=checked]:bg-on-primary-fixed-variant" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typical occasions */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5">
              <S title="Typical occasions" />
              <p className="text-outline mb-2" style={{ fontSize: '11px' }}>
                Free-form tags (e.g. daily, tshechu, losar, breakfast).
              </p>
              <EditableTagList
                items={data.typical_occasions ?? []}
                onChange={v => update('typical_occasions', v.length ? v : null)}
                placeholder="Add occasion…"
                tagStyle="gold"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
