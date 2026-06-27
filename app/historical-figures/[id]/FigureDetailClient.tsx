'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown } from 'lucide-react';
import { toast } from 'sonner';

import type { HistoricalFigure, RefOption } from '@/lib/db';
import {
  updateHistoricalFigure, setHistoricalFigureStatus, deleteHistoricalFigure,
} from '@/lib/actions/historical-figures';
import {
  StatusBadge, StatusActions, DiscardSaveButtons, DeleteButton, FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export default function FigureDetailClient({
  figure, periods,
}: { figure: HistoricalFigure; periods: RefOption[] }) {
  const [data, setData] = useState({ ...figure });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(figure.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(figure.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof HistoricalFigure>(key: K, value: HistoricalFigure[K]) => {
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
      name:         data.name_en,
      name_dz:      data.name_dz,
      honorific:    data.honorific,
      role:         data.role,
      slug:         data.slug,
      period_id:    data.period_id,
      birth_year:   data.birth_year,
      death_year:   data.death_year,
      short_bio:    data.short_bio,
      significance: data.significance,
    };
    startTransition(async () => {
      const res = await updateHistoricalFigure(data.id, patch, updatedAt ?? undefined);
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
      const res = await setHistoricalFigureStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const refCount = data.heritage_count + data.dzong_count + data.festival_count;

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href="/historical-figures"
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Historical Figures
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.honorific && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                  <Crown size={11} /> {data.honorific}
                </span>
              )}
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>HF-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {data.name_dz && (
              <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>{data.name_dz}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...figure }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteHistoricalFigure(data.id)}
              redirectTo="/historical-figures" entityLabel={data.name_en} />
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
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en} onChange={e => update('name_en', e.target.value)}
                        className="border-outline-variant h-9 text-sm" />
                      <FieldError message={errors.name} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Honorific" hint='"Guru", "Zhabdrung", "Druk Gyalpo"…'>
                      <Input value={data.honorific ?? ''} onChange={e => update('honorific', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Role" hint='"Saint", "Treasure Revealer", "Monarch"…'>
                      <Input value={data.role ?? ''} onChange={e => update('role', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Slug">
                      <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm font-mono" />
                      <FieldError message={errors.slug} />
                    </F>
                  </div>
                </div>
              </div>

              <div>
                <S title="Biography" />
                <div className="space-y-3">
                  <F label="Short bio">
                    <Textarea value={data.short_bio ?? ''} onChange={e => update('short_bio', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Significance" hint="Why this figure matters in the cultural/religious narrative">
                    <Textarea value={data.significance ?? ''} onChange={e => update('significance', e.target.value || null)}
                      rows={5} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>

          {refCount > 0 && (
            <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
              <CardContent className="p-5">
                <S title="Referenced by" />
                <div className="grid grid-cols-3 gap-4">
                  <Link href={`/heritage?founder=${data.id}`}
                    className="border border-outline-variant rounded-lg p-3 bg-surface-container hover:bg-surface-container-high transition-colors">
                    <p className="font-bold text-on-surface" style={{ fontSize: '24px' }}>{data.heritage_count}</p>
                    <p className="text-on-surface-variant" style={{ fontSize: '13px' }}>Heritage sites</p>
                  </Link>
                  <Link href={`/dzongs?founder=${data.id}`}
                    className="border border-outline-variant rounded-lg p-3 bg-surface-container hover:bg-surface-container-high transition-colors">
                    <p className="font-bold text-on-surface" style={{ fontSize: '24px' }}>{data.dzong_count}</p>
                    <p className="text-on-surface-variant" style={{ fontSize: '13px' }}>Dzongs</p>
                  </Link>
                  <Link href={`/festivals?figure=${data.id}`}
                    className="border border-outline-variant rounded-lg p-3 bg-surface-container hover:bg-surface-container-high transition-colors">
                    <p className="font-bold text-on-surface" style={{ fontSize: '24px' }}>{data.festival_count}</p>
                    <p className="text-on-surface-variant" style={{ fontSize: '13px' }}>Festivals</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Period & Dates" />
              <F label="Historical period">
                <Select value={data.period_id ? String(data.period_id) : '__none'}
                  onValueChange={(v) => update('period_id', v === '__none' ? null : Number(v))}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {periods.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.period_id} />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Birth year">
                  <Input type="number" value={data.birth_year ?? ''}
                    onChange={e => update('birth_year', e.target.value ? Number(e.target.value) : null)}
                    className="border-outline-variant h-9 text-sm font-mono" />
                  <FieldError message={errors.birth_year} />
                </F>
                <F label="Death year">
                  <Input type="number" value={data.death_year ?? ''}
                    onChange={e => update('death_year', e.target.value ? Number(e.target.value) : null)}
                    className="border-outline-variant h-9 text-sm font-mono" />
                  <FieldError message={errors.death_year} />
                </F>
              </div>
              <p className="text-outline" style={{ fontSize: '11px' }}>
                Years can be left blank for mythic eras. Negative values allowed (BCE).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
