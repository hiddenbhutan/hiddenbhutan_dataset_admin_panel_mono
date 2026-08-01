'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown } from 'lucide-react';
import { toast } from 'sonner';

import type { TraditionalGame, MediaItem } from '@/lib/db';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import { updateTraditionalGame, setTraditionalGameStatus, deleteTraditionalGame } from '@/lib/actions/traditional-games';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

function parseRange(range: string | null): { min: number | null; max: number | null } {
  if (!range) return { min: null, max: null };
  const m = range.match(/^[\[\(](\d*),(\d*)[\]\)]$/);
  if (!m) return { min: null, max: null };
  const [_, lo, hi] = m;
  return {
    min: lo === '' ? null : Number(lo) + (range.startsWith('(') ? 1 : 0),
    max: hi === '' ? null : Number(hi) - (range.endsWith(')')   ? 1 : 0),
  };
}

export default function GameDetailClient({ game, media }: { game: TraditionalGame; media: MediaItem[] }) {
  const initialPlayers = parseRange(game.typical_players);

  const [data, setData] = useState({ ...game });
  const [playersMin, setPlayersMin] = useState<number | null>(initialPlayers.min);
  const [playersMax, setPlayersMax] = useState<number | null>(initialPlayers.max);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(game.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(game.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof TraditionalGame>(key: K, value: TraditionalGame[K]) => {
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
      slug:              data.slug,
      name_en:           data.name_en,
      name_dz:           data.name_dz,
      name_romanized:    data.name_romanized,
      description:       data.description,
      rules:             data.rules,
      history:           data.history,
      equipment:         data.equipment,
      season:            data.season,
      is_competitive:    data.is_competitive,
      is_national_sport: data.is_national_sport,
      typical_players:   (playersMin == null && playersMax == null)
                          ? null
                          : { min: playersMin, max: playersMax },
    };
    startTransition(async () => {
      const res = await updateTraditionalGame(data.id, patch, updatedAt ?? undefined);
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
      const res = await setTraditionalGameStatus(data.id, next, updatedAt ?? undefined);
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
        <Link href="/traditional-games" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Traditional Games
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {data.is_national_sport ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '10px' }}>
                  <Crown size={11} /> National sport
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: data.is_competitive ? '#dae69f' : '#e8e2d7', color: data.is_competitive ? '#5d682e' : '#424844', fontSize: '11px' }}>
                  {data.is_competitive ? 'Competitive' : 'Casual'}
                </span>
              )}
              <span className="font-mono text-[#727973] text-sm border border-[#c2c8c2] px-2 py-0.5 rounded">TG-{data.id}</span>
              {data.slug && <span className="font-mono text-[#727973]" style={{ fontSize: '11px' }}>/{data.slug}</span>}
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
              onDiscard={() => {
                setData({ ...game });
                const p = parseRange(game.typical_players);
                setPlayersMin(p.min);
                setPlayersMax(p.max);
                setDirty(false);
              }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteTraditionalGame(data.id)}
              redirectTo="/traditional-games" entityLabel={data.name_en} />
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
                  <F label="Slug">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm font-mono" />
                    <FieldError message={errors.slug} />
                  </F>
                </div>
              </div>
              <div>
                <S title="Content" />
                <div className="space-y-3">
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)} rows={4} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Rules">
                    <Textarea value={data.rules ?? ''} onChange={e => update('rules', e.target.value || null)} rows={4} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="History">
                    <Textarea value={data.history ?? ''} onChange={e => update('history', e.target.value || null)} rows={3} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Equipment">
                    <Textarea value={data.equipment ?? ''} onChange={e => update('equipment', e.target.value || null)} rows={2} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border-[#c2c8c2] bg-white">
            <CardHeader>
              <CardTitle className="text-[#1d1c15]" style={{ fontSize: '16px' }}>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityMediaPanel
                entityType="traditional_game"
                entityId={game.id}
                items={media}
                revalidatePaths={[`/traditional-games/${game.id}`, '/media']}
              />
            </CardContent>
          </Card>

          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5 space-y-4">
              <S title="Play" />
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#424844]">National sport</Label>
                <Switch checked={!!data.is_national_sport}
                  onCheckedChange={v => update('is_national_sport', v ? 1 : 0)}
                  className="data-[state=checked]:bg-[#304d3e]" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#424844]">Competitive</Label>
                <Switch checked={!!data.is_competitive}
                  onCheckedChange={v => update('is_competitive', v ? 1 : 0)}
                  className="data-[state=checked]:bg-[#304d3e]" />
              </div>
              <F label="Season" hint="Free-form (e.g. 'winter', 'year-round').">
                <Input value={data.season ?? ''} onChange={e => update('season', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Players (min)">
                  <Input type="number" min={1} value={playersMin ?? ''}
                    onChange={e => { setPlayersMin(e.target.value ? Number(e.target.value) : null); setDirty(true); }}
                    className="border-[#c2c8c2] h-9 text-sm" />
                </F>
                <F label="Players (max)">
                  <Input type="number" min={1} value={playersMax ?? ''}
                    onChange={e => { setPlayersMax(e.target.value ? Number(e.target.value) : null); setDirty(true); }}
                    className="border-[#c2c8c2] h-9 text-sm" />
                </F>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
