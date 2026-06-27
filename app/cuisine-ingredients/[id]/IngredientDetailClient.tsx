'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Leaf, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import type { CuisineIngredientFull, CuisineIngredientDish, RefOption } from '@/lib/db';
import { updateCuisineIngredient, setCuisineIngredientStatus, deleteCuisineIngredient } from '@/lib/actions/cuisine-ingredients';
import {
  StatusBadge, StatusActions, DiscardSaveButtons, DeleteButton, FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-on-primary-fixed-variant mb-1.5 block uppercase" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-outline" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-outline-variant mb-4">
      <p className="font-bold uppercase text-on-primary-fixed-variant" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>{title}</p>
    </div>
  );
}

export default function IngredientDetailClient({
  ingredient, species, dishes,
}: {
  ingredient: CuisineIngredientFull;
  species: RefOption[];
  dishes: CuisineIngredientDish[];
}) {
  const [data, setData] = useState({ ...ingredient });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(ingredient.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(ingredient.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof CuisineIngredientFull>(key: K, value: CuisineIngredientFull[K]) => {
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
      name:           data.name_en,
      name_dz:        data.name_dz,
      name_romanized: data.name_romanized,
      slug:           data.slug,
      description:    data.description,
      notes:          data.notes,
      species_id:     data.species_id,
      is_local:       data.is_local,
      is_seasonal:    data.is_seasonal,
      season_months:  data.is_seasonal ? data.season_months : null,
    };
    startTransition(async () => {
      const res = await updateCuisineIngredient(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name_en}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        toast.error(res.message ?? 'Please fix the highlighted fields');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setCuisineIngredientStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href="/cuisine-ingredients"
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Cuisine Ingredients
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.is_local ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <Leaf size={11} /> Local
                </span>
              ) : null}
              {data.is_seasonal ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <Calendar size={11} /> {data.season_months ?? 'Seasonal'}
                </span>
              ) : null}
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>CI-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {(data.name_dz || data.name_romanized) && (
              <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>
                {[data.name_dz, data.name_romanized].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...ingredient }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteCuisineIngredient(data.id)}
              redirectTo="/cuisine-ingredients" entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en} onChange={e => update('name_en', e.target.value)} className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.name} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)} className="border-outline-variant h-9 text-sm italic" />
                    </F>
                  </div>
                  <F label="Slug">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-outline-variant h-9 text-sm font-mono" />
                    <FieldError message={errors.slug} />
                  </F>
                </div>
              </div>

              <div>
                <S title="Description" />
                <div className="space-y-3">
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)} rows={4} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Notes" hint="Preparation, sourcing, storage notes.">
                    <Textarea value={data.notes ?? ''} onChange={e => update('notes', e.target.value || null)} rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>

          {dishes.length > 0 && (
            <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
              <CardContent className="p-5">
                <S title={`Used in ${dishes.length} dish${dishes.length === 1 ? '' : 'es'}`} />
                <div className="space-y-2">
                  {dishes.map(d => (
                    <div key={d.cuisine_item_id} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg bg-surface-container">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/food/${d.cuisine_item_id}`} className="font-semibold text-on-surface hover:text-on-primary-fixed-variant" style={{ fontSize: '14px' }}>{d.cuisine_item_name}</Link>
                        {d.is_optional ? (
                          <span className="px-1.5 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em' }}>Optional</span>
                        ) : null}
                        {d.is_garnish ? (
                          <span className="px-1.5 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em' }}>Garnish</span>
                        ) : null}
                      </div>
                      {d.quantity_notes && (
                        <span className="text-outline italic" style={{ fontSize: '12px' }}>{d.quantity_notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Sourcing" />
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Locally grown / produced</Label>
                <Switch checked={!!data.is_local}
                  onCheckedChange={v => update('is_local', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Seasonal</Label>
                <Switch checked={!!data.is_seasonal}
                  onCheckedChange={v => update('is_seasonal', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              {data.is_seasonal ? (
                <F label="Season months" hint='Free-form, e.g. "Aug-Oct", "winter".'>
                  <Input value={data.season_months ?? ''} onChange={e => update('season_months', e.target.value || null)} className="border-outline-variant h-9 text-sm" />
                </F>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Species link" />
              <F label="Linked species" hint="Optional taxonomic link to the species catalog.">
                <Select value={data.species_id ? String(data.species_id) : '__none'}
                  onValueChange={(v) => update('species_id', v === '__none' ? null : Number(v))}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {species.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.species_id} />
              </F>
              {data.species_id && (
                <Link href={`/species/${data.species_id}`}
                  className="text-on-primary-fixed-variant hover:underline" style={{ fontSize: '12px' }}>
                  View species record →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
