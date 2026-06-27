import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getZorigChusum } from '@/lib/db';
import { createZorigChusum } from '@/lib/actions/zorig-chusum';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download, Pencil } from 'lucide-react';

export const metadata: Metadata = { title: 'Zorig Chusum' };

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

export default async function ZorigChusumPage() {
  const items = await getZorigChusum();
  const published = items.filter(i => i.content_status === 'published').length;
  const draft = items.filter(i => i.content_status === 'draft').length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Zorig Chusum</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            The 13 traditional Bhutanese arts &amp; crafts · {items.length} catalogued · {published} published · {draft} draft
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add craft" action={async () => {
            'use server';
            const res = await createZorigChusum();
            if (res.ok && res.id) redirect(`/zorig-chusum/${res.id}`);
          }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map(craft => {
          const cs = CONTENT_STATUS[craft.content_status] ?? CONTENT_STATUS.draft;
          return (
            <Link key={craft.id} href={`/zorig-chusum/${craft.id}`} className="block group">
              <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-4 h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded flex items-center justify-center bg-primary-container text-tertiary-fixed font-bold" style={{ fontSize: '12px' }}>
                      {craft.ordinal}
                    </span>
                    <div>
                      <p className="text-on-surface font-bold" style={{ fontSize: '14px' }}>{craft.name_en}</p>
                      {(craft.name_dz || craft.name_romanized) && (
                        <p className="italic text-on-surface-variant" style={{ fontSize: '11px' }}>
                          {[craft.name_dz, craft.name_romanized].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-full uppercase" style={{ ...labelCapsStyle, fontSize: '9px', backgroundColor: cs.bg, color: cs.color }}>{cs.label}</span>
                    <span className="flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-on-primary-fixed-variant" style={bodySmStyle}>
                      <Pencil size={11} /> Edit
                    </span>
                  </div>
                </div>
                {craft.short_summary && (
                  <p className="text-on-surface-variant leading-relaxed mb-3" style={bodySmStyle}>
                    {craft.short_summary.slice(0, 160)}{craft.short_summary.length > 160 ? '…' : ''}
                  </p>
                )}
                {craft.where_practiced && craft.where_practiced.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {craft.where_practiced.slice(0, 4).map(loc => (
                      <span key={loc} className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant" style={{ fontSize: '10px' }}>{loc}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <span className="text-on-surface-variant" style={{ fontSize: '11px' }}>
                    {craft.masters && craft.masters.length > 0
                      ? `${craft.masters.length} master${craft.masters.length === 1 ? '' : 's'} recorded`
                      : 'No masters recorded'}
                  </span>
                  <span className="text-on-primary-fixed-variant font-semibold" style={{ fontSize: '12px' }}>View &amp; edit →</span>
                </div>
              </div>
            </Link>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-2 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-on-surface-variant" style={bodyMdStyle}>
            content.zorig_chusum is empty — seed the 13 crafts to populate this view.
          </div>
        )}
      </div>
    </div>
  );
}
