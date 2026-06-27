import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getHistoricalFigures,
  getHistoricalFigureStatusCounts,
  getHistoricalPeriodOptions,
} from '@/lib/db';
import { createHistoricalFigure } from '@/lib/actions/historical-figures';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddNewForm from '@/components/AddNewForm';
import { Download, Pencil, Search, Crown } from 'lucide-react';

export const metadata: Metadata = { title: 'Historical Figures' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};
const dataMonoStyle: React.CSSProperties = {
  fontSize: '12px', fontFamily: 'var(--font-mono, JetBrains Mono, ui-monospace)', lineHeight: '16px',
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

interface SearchParams {
  status?: string;
  period?: string;
  search?: string;
}

export default async function HistoricalFiguresPage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status = (sp.status as 'draft'|'in_review'|'published'|'archived'|'all'|undefined) ?? 'all';
  const periodId = sp.period ? Number(sp.period) : undefined;
  const search = sp.search?.trim() || undefined;

  const [figures, counts, periods] = await Promise.all([
    getHistoricalFigures({ contentStatus: status, periodId, search }, 500),
    getHistoricalFigureStatusCounts(),
    getHistoricalPeriodOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Historical Figures</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.total} figures · {counts.published} published · {counts.draft} draft · {counts.in_review} in review
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add figure" action={async () => {
            'use server';
            const res = await createHistoricalFigure();
            if (res.ok && res.id) redirect(`/historical-figures/${res.id}`);
          }} />
        </div>
      </div>

      <form action="/historical-figures" className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <label className="block mb-1.5 text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <Input name="search" defaultValue={search ?? ''} placeholder="Name (English or Dzongkha)…"
                className="pl-9 h-10 border-outline-variant bg-surface-container-lowest text-sm" />
            </div>
          </div>
          <div className="col-span-3">
            <label className="block mb-1.5 text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>Period</label>
            <select name="period" defaultValue={periodId ? String(periodId) : ''}
              className="w-full h-10 border border-outline-variant bg-surface-container-lowest rounded-md text-sm px-2">
              <option value="">All periods</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className="block mb-1.5 text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>Workflow</label>
            <select name="status" defaultValue={status}
              className="w-full h-10 border border-outline-variant bg-surface-container-lowest rounded-md text-sm px-2">
              <option value="all">All</option>
              <option value="draft">Draft ({counts.draft})</option>
              <option value="in_review">In review ({counts.in_review})</option>
              <option value="published">Published ({counts.published})</option>
              <option value="archived">Archived ({counts.archived})</option>
            </select>
          </div>
          <div className="col-span-12 flex justify-end gap-2">
            <Link href="/historical-figures"
              className="px-3 h-9 border border-outline-variant rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center" style={titleSmStyle}>
              Reset
            </Link>
            <button type="submit"
              className="px-4 h-9 rounded-md bg-on-primary-fixed-variant text-tertiary-fixed flex items-center" style={titleSmStyle}>
              Apply filters
            </button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {figures.map(f => {
          const cs = CONTENT_STATUS[f.content_status] ?? CONTENT_STATUS.draft;
          const refCount = f.heritage_count + f.dzong_count + f.festival_count;
          return (
            <Link key={f.id} href={`/historical-figures/${f.id}`} className="block group">
              <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-4 h-full">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {f.honorific && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ ...labelCapsStyle, fontSize: '10px' }}>
                          <Crown size={11} /> {f.honorific}
                        </span>
                      )}
                      <p className="text-on-surface font-bold truncate" style={{ fontSize: '16px' }}>{f.name_en}</p>
                      <span className="px-1.5 py-0.5 rounded-full uppercase" style={{ ...labelCapsStyle, fontSize: '9px', backgroundColor: cs.bg, color: cs.color }}>{cs.label}</span>
                    </div>
                    {f.name_dz && (
                      <p className="italic text-on-surface-variant" style={{ fontSize: '12px' }}>{f.name_dz}</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-on-primary-fixed-variant flex-shrink-0" style={{ fontSize: '12px' }}>
                    <Pencil size={11} /> Edit
                  </span>
                </div>
                <div className="space-y-0.5 mb-3">
                  {f.role && (
                    <p className="text-on-surface-variant" style={bodySmStyle}>
                      <span className="font-semibold">Role:</span> {f.role}
                    </p>
                  )}
                  {f.period_label && (
                    <p className="text-on-surface-variant" style={bodySmStyle}>
                      <span className="font-semibold">Period:</span> {f.period_label}
                    </p>
                  )}
                  {(f.birth_year != null || f.death_year != null) && (
                    <p className="text-outline" style={dataMonoStyle}>
                      {f.birth_year ?? '?'} – {f.death_year ?? '?'}
                    </p>
                  )}
                </div>
                {f.short_bio && (
                  <p className="text-on-surface-variant leading-relaxed mb-3" style={bodySmStyle}>
                    {f.short_bio.slice(0, 180)}{f.short_bio.length > 180 ? '…' : ''}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <span className="text-on-surface-variant" style={{ fontSize: '11px' }}>
                    Referenced by {refCount} record{refCount === 1 ? '' : 's'}
                    {refCount > 0 && (
                      <span className="text-outline ml-1">
                        ({[
                          f.heritage_count ? `${f.heritage_count} heritage` : null,
                          f.dzong_count    ? `${f.dzong_count} dzong`       : null,
                          f.festival_count ? `${f.festival_count} festival` : null,
                        ].filter(Boolean).join(', ')})
                      </span>
                    )}
                  </span>
                  <span className="text-on-primary-fixed-variant font-semibold" style={{ fontSize: '12px' }}>View &amp; edit →</span>
                </div>
              </div>
            </Link>
          );
        })}
        {figures.length === 0 && (
          <div className="col-span-2 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-on-surface-variant" style={bodyMdStyle}>
            No historical figures match these filters.
          </div>
        )}
      </div>
    </div>
  );
}
