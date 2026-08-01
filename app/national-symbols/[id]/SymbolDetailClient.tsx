'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import type { NationalSymbol, NationalSymbolKind, RefOption, MediaItem } from '@/lib/db';
import { updateNationalSymbol, setNationalSymbolStatus, deleteNationalSymbol } from '@/lib/actions/national-symbols';
import {
  StatusBadge,
  StatusActions,
  DiscardSaveButtons,
  DeleteButton,
  FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const KIND_OPTS: { value: NationalSymbolKind; label: string; icon: string }[] = [
  { value: 'animal',       label: 'Animal',         icon: '🦌' },
  { value: 'bird',         label: 'Bird',           icon: '🐦‍⬛' },
  { value: 'flower',       label: 'Flower',         icon: '🌸' },
  { value: 'tree',         label: 'Tree',           icon: '🌲' },
  { value: 'sport',        label: 'Sport',          icon: '🏹' },
  { value: 'dress_male',   label: 'Dress (male)',   icon: '👘' },
  { value: 'dress_female', label: 'Dress (female)', icon: '👘' },
  { value: 'game',         label: 'Game',           icon: '🎲' },
  { value: 'anthem',       label: 'Anthem',         icon: '🎵' },
  { value: 'flag',         label: 'Flag',           icon: '🏳️' },
  { value: 'emblem',       label: 'Emblem',         icon: '🛡️' },
  { value: 'currency',     label: 'Currency',       icon: '💰' },
  { value: 'day',          label: 'National day',   icon: '🎉' },
  { value: 'other',        label: 'Other',          icon: '✨' },
];

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-[#424844] mb-1.5 block font-semibold uppercase tracking-wide">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[#727973]" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-[#e8e2d7] mb-4">
      <p className="font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{title}</p>
    </div>
  );
}

export default function SymbolDetailClient({
  symbol,
  species,
  figures,
  media,
}: {
  symbol: NationalSymbol;
  species: RefOption[];
  figures: RefOption[];
  media: MediaItem[];
}) {
  const [data, setData] = useState({ ...symbol });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(symbol.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(symbol.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof NationalSymbol>(key: K, value: NationalSymbol[K]) => {
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
      kind:           data.kind,
      name_en:        data.name_en,
      name_dz:        data.name_dz,
      name_romanized: data.name_romanized,
      description:    data.description,
      significance:   data.significance,
      folklore:       data.folklore,
      history:        data.history,
      species_id:     data.species_id,
      figure_id:      data.figure_id,
    };
    startTransition(async () => {
      const res = await updateNationalSymbol(data.id, patch, updatedAt ?? undefined);
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
      const res = await setNationalSymbolStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const icon = KIND_OPTS.find(k => k.value === data.kind)?.icon ?? '✨';

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href="/national-symbols" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> National Symbols
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: '#f3ede2' }}>{icon}</span>
              <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#e8e2d7', color: '#424844', fontSize: '11px' }}>
                {KIND_OPTS.find(k => k.value === data.kind)?.label ?? data.kind}
              </span>
              <span className="font-mono text-[#727973] text-sm border border-[#c2c8c2] px-2 py-0.5 rounded">NS-{data.id}</span>
            </div>
            <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name_en}</h1>
            {(data.name_dz || data.name_romanized) && (
              <p className="italic text-[#727973] mt-0.5" style={{ fontSize: '14px' }}>
                {[data.name_dz, data.name_romanized].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...symbol }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteNationalSymbol(data.id)}
              redirectTo="/national-symbols" entityLabel={data.name_en} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-4">
          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5 space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <F label="Kind" hint="At most one symbol per kind — DB enforces uniqueness.">
                    <Select value={data.kind} onValueChange={v => { if (v) update('kind', v as NationalSymbolKind); }}>
                      <SelectTrigger className="border-[#c2c8c2] h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KIND_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Name (English)">
                      <Input value={data.name_en} onChange={e => update('name_en', e.target.value)} className="border-[#c2c8c2] h-9 text-sm" />
                      <FieldError message={errors.name_en} />
                    </F>
                    <F label="Name (Dzongkha)">
                      <Input value={data.name_dz ?? ''} onChange={e => update('name_dz', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm" />
                    </F>
                    <F label="Romanized">
                      <Input value={data.name_romanized ?? ''} onChange={e => update('name_romanized', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm italic" />
                    </F>
                  </div>
                </div>
              </div>
              <div>
                <S title="Content" />
                <div className="space-y-3">
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)} rows={4} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Significance">
                    <Textarea value={data.significance ?? ''} onChange={e => update('significance', e.target.value || null)} rows={4} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Folklore">
                    <Textarea value={data.folklore ?? ''} onChange={e => update('folklore', e.target.value || null)} rows={3} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="History">
                    <Textarea value={data.history ?? ''} onChange={e => update('history', e.target.value || null)} rows={3} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5 space-y-4">
              <S title="Links" />
              <F label="Linked species" hint="When the symbol is a living thing.">
                <Select value={data.species_id ? String(data.species_id) : '__none'}
                  onValueChange={v => { if (v) update('species_id', v === '__none' ? null : Number(v)); }}>
                  <SelectTrigger className="border-[#c2c8c2] h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {species.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Linked figure" hint="When associated with a king / lama.">
                <Select value={data.figure_id ? String(data.figure_id) : '__none'}
                  onValueChange={v => { if (v) update('figure_id', v === '__none' ? null : Number(v)); }}>
                  <SelectTrigger className="border-[#c2c8c2] h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {figures.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-[#c2c8c2] bg-white">
        <CardContent className="p-5 space-y-4">
          <S title="Media" />
          <EntityMediaPanel
            entityType="national_symbol"
            entityId={symbol.id}
            items={media}
            revalidatePaths={[`/national-symbols/${symbol.id}`, '/media']}
          />
        </CardContent>
      </Card>
    </div>
  );
}
