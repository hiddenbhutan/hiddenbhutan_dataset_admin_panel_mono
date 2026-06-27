import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getThangkas, getThangkaStatusCounts } from '@/lib/db';
import { createThangka } from '@/lib/actions/thangkas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddNewForm from '@/components/AddNewForm';
import { Download, Pencil, Search, Sparkles } from 'lucide-react';

export const metadata: Metadata = { title: 'Thangkas' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const STYLE_LABELS: Record<string, string> = {
  religious_painted:     'Painted',
  'religious_appliqué':  'Appliqué',
  religious_embroidered: 'Embroidered',
  thongdrol:             'Thongdrol',
  mandala:               'Mandala',
  lineage_portrait:      'Lineage portrait',
  other:                 'Other',
};

interface SearchParams {
  status?: string;
  style?: string;
  thongdrol?: string;
  search?: string;
}

export default async function ThangkasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status = (sp.status as 'draft'|'in_review'|'published'|'archived'|'all'|undefined) ?? 'all';
  const style = sp.style && sp.style !== 'all' ? sp.style as 'religious_painted'|'religious_appliqué'|'religious_embroidered'|'thongdrol'|'mandala'|'lineage_portrait'|'other' : undefined;
  const thongdrolOnly = sp.thongdrol === '1';
  const search = sp.search?.trim() || undefined;

  const [thangkas, counts] = await Promise.all([
    getThangkas({ contentStatus: status, style, thongdrolOnly, search }, 500),
    getThangkaStatusCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Thangkas</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.total} thangkas · {counts.thongdrol} thongdrol · {counts.published} published · {counts.draft} draft
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add thangka" action={async () => {
            'use server';
            const res = await createThangka();
            if (res.ok && res.id) redirect(`/thangkas/${res.id}`);
          }} />
        </div>
      </div>

      <form action="/thangkas" className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-5">
            <label className="block mb-1.5 text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <Input name="search" defaultValue={search ?? ''} placeholder="Name or depicted figure…"
                className="pl-9 h-10 border-outline-variant bg-surface-container-lowest text-sm" />
            </div>
          </div>
          <div className="col-span-3">
            <label className="block mb-1.5 text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>Style</label>
            <select name="style" defaultValue={style ?? 'all'}
              className="w-full h-10 border border-outline-variant bg-surface-container-lowest rounded-md text-sm px-2">
              <option value="all">All styles</option>
              {Object.entries(STYLE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
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
          <div className="col-span-2 flex items-end">
            <label className="flex items-center gap-2 h-10 w-full px-3 border border-outline-variant rounded-md bg-surface-container-lowest cursor-pointer">
              <input type="checkbox" name="thongdrol" value="1" defaultChecked={thongdrolOnly}
                className="h-4 w-4 accent-on-primary-fixed-variant" />
              <span className="text-on-surface" style={bodySmStyle}>Thongdrol only</span>
            </label>
          </div>
          <div className="col-span-12 flex justify-end gap-2">
            <Link href="/thangkas"
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
        {thangkas.map(t => {
          const cs = CONTENT_STATUS[t.content_status] ?? CONTENT_STATUS.draft;
          const origin = t.origin_dzong_name ?? t.origin_heritage_site_name;
          return (
            <Link key={t.id} href={`/thangkas/${t.id}`} className="block group">
              <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-4 h-full">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {t.is_thongdrol ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ ...labelCapsStyle, fontSize: '10px' }}>
                          <Sparkles size={11} /> Thongdrol
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ ...labelCapsStyle, fontSize: '10px' }}>
                          {STYLE_LABELS[t.style] ?? t.style}
                        </span>
                      )}
                      <p className="text-on-surface font-bold truncate" style={{ fontSize: '16px' }}>{t.name_en}</p>
                      <span className="px-1.5 py-0.5 rounded-full uppercase" style={{ ...labelCapsStyle, fontSize: '9px', backgroundColor: cs.bg, color: cs.color }}>{cs.label}</span>
                    </div>
                    {(t.name_dz || t.name_romanized) && (
                      <p className="italic text-on-surface-variant" style={{ fontSize: '12px' }}>
                        {[t.name_dz, t.name_romanized].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-on-primary-fixed-variant flex-shrink-0" style={{ fontSize: '12px' }}>
                    <Pencil size={11} /> Edit
                  </span>
                </div>
                <div className="space-y-0.5 mb-3">
                  {t.depicts && (
                    <p className="text-on-surface-variant" style={bodySmStyle}>
                      <span className="font-semibold">Depicts:</span> {t.depicts.slice(0, 100)}{t.depicts.length > 100 ? '…' : ''}
                    </p>
                  )}
                  {origin && (
                    <p className="text-on-surface-variant" style={bodySmStyle}>
                      <span className="font-semibold">Origin:</span> {origin}
                    </p>
                  )}
                  {(t.height_cm || t.width_cm) && (
                    <p className="text-outline" style={{ fontSize: '12px', fontFamily: 'var(--font-mono, JetBrains Mono, ui-monospace)' }}>
                      {t.height_cm ?? '?'} × {t.width_cm ?? '?'} cm
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <span className="text-on-surface-variant" style={{ fontSize: '11px' }}>
                    Shown at {t.festival_display_count} festival{t.festival_display_count === 1 ? '' : 's'}
                  </span>
                  <span className="text-on-primary-fixed-variant font-semibold" style={{ fontSize: '12px' }}>View &amp; edit →</span>
                </div>
              </div>
            </Link>
          );
        })}
        {thangkas.length === 0 && (
          <div className="col-span-2 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-on-surface-variant" style={bodyMdStyle}>
            No thangkas match these filters.
          </div>
        )}
      </div>
    </div>
  );
}
