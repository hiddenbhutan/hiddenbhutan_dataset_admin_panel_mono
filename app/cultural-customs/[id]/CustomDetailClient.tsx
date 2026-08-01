'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import type { CulturalCustom, CulturalCustomCategory, CulturalSeverity, MediaItem } from '@/lib/db';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import { updateCulturalCustom, setCulturalCustomStatus, deleteCulturalCustom } from '@/lib/actions/cultural-customs';
import {
  StatusBadge,
  StatusActions,
  DiscardSaveButtons,
  DeleteButton,
  FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import EditableTagList from '@/components/EditableTagList';

const CATEGORY_OPTS: { value: CulturalCustomCategory; label: string }[] = [
  { value: 'greeting',       label: 'Greeting' },
  { value: 'dress',          label: 'Dress' },
  { value: 'dining',         label: 'Dining' },
  { value: 'religious',      label: 'Religious' },
  { value: 'hospitality',    label: 'Hospitality' },
  { value: 'gift_giving',    label: 'Gift giving' },
  { value: 'taboo',          label: 'Taboo' },
  { value: 'driglam_namzha', label: 'Driglam Namzha' },
  { value: 'etiquette',      label: 'Etiquette' },
  { value: 'other',          label: 'Other' },
];

const SEVERITY_OPTS: { value: CulturalSeverity; label: string; bg: string; color: string }[] = [
  { value: 'critical',      label: 'Critical',      bg: '#ffdad6', color: '#93000a' },
  { value: 'important',     label: 'Important',     bg: '#fdefd8', color: '#7a4a10' },
  { value: 'advisable',     label: 'Advisable',     bg: '#d6e8f0', color: '#2c5a70' },
  { value: 'informational', label: 'Informational', bg: '#f3ede2', color: '#424844' },
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

export default function CustomDetailClient({ custom, media }: { custom: CulturalCustom; media: MediaItem[] }) {
  const [data, setData] = useState({ ...custom });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(custom.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(custom.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof CulturalCustom>(key: K, value: CulturalCustom[K]) => {
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
      slug:             data.slug,
      category:         data.category,
      title_en:         data.title_en,
      title_dz:         data.title_dz,
      description:      data.description,
      visitor_guidance: data.visitor_guidance,
      background:       data.background,
      severity:         data.severity,
      applies_in_contexts: data.applies_in_contexts ? data.applies_in_contexts.join('\n') : null,
    };
    startTransition(async () => {
      const res = await updateCulturalCustom(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.title_en}`);
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
      const res = await setCulturalCustomStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const sev = SEVERITY_OPTS.find(s => s.value === data.severity) ?? SEVERITY_OPTS[2];

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href="/cultural-customs" className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Cultural Customs
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#e8e2d7', color: '#424844', fontSize: '11px' }}>
                {CATEGORY_OPTS.find(c => c.value === data.category)?.label ?? data.category}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: sev.bg, color: sev.color, fontSize: '10px' }}>
                {data.severity === 'critical' && <AlertTriangle size={11} />}
                {sev.label}
              </span>
              <span className="font-mono text-[#727973] text-sm border border-[#c2c8c2] px-2 py-0.5 rounded">CC-{data.id}</span>
              {data.slug && <span className="font-mono text-[#727973]" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.title_en}</h1>
            {data.title_dz && (
              <p className="italic text-[#727973] mt-0.5" style={{ fontSize: '14px' }}>{data.title_dz}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...custom }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteCulturalCustom(data.id)}
              redirectTo="/cultural-customs" entityLabel={data.title_en} />
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
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Title (English)">
                      <Input value={data.title_en} onChange={e => update('title_en', e.target.value)} className="border-[#c2c8c2] h-9 text-sm" />
                      <FieldError message={errors.title_en} />
                    </F>
                    <F label="Title (Dzongkha)">
                      <Input value={data.title_dz ?? ''} onChange={e => update('title_dz', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm" />
                    </F>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Category">
                      <Select value={data.category} onValueChange={v => { if (v) update('category', v as CulturalCustomCategory); }}>
                        <SelectTrigger className="border-[#c2c8c2] h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Severity" hint="Drives 'critical do-not' highlighting in the app.">
                      <Select value={data.severity} onValueChange={v => { if (v) update('severity', v as CulturalSeverity); }}>
                        <SelectTrigger className="border-[#c2c8c2] h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEVERITY_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Slug">
                      <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)} className="border-[#c2c8c2] h-9 text-sm font-mono" />
                      <FieldError message={errors.slug} />
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
                  <F label="Visitor guidance" hint={`"As a tourist, do / don't…"`}>
                    <Textarea value={data.visitor_guidance ?? ''} onChange={e => update('visitor_guidance', e.target.value || null)} rows={4} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                  <F label="Background" hint="Cultural context / origins.">
                    <Textarea value={data.background ?? ''} onChange={e => update('background', e.target.value || null)} rows={3} className="border-[#c2c8c2] text-sm resize-none" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5">
              <S title="Applies in" />
              <p className="text-[#727973] mb-2" style={{ fontSize: '11px' }}>Contexts where this custom applies (e.g. dzong, monastery, village, general).</p>
              <EditableTagList
                items={data.applies_in_contexts ?? []}
                onChange={v => update('applies_in_contexts', v.length ? v : null)}
                placeholder="Add context…"
                tagStyle="gold"
              />
            </CardContent>
          </Card>

          <Card className="border-[#c2c8c2] bg-white">
            <CardContent className="p-5">
              <S title="Media" />
              <EntityMediaPanel
                entityType="cultural_custom"
                entityId={custom.id}
                items={media}
                revalidatePaths={[`/cultural-customs/${custom.id}`, '/media']}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
