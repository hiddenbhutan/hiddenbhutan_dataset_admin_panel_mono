import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCulturalCustoms } from '@/lib/db';
import { createCulturalCustom } from '@/lib/actions/cultural-customs';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download, Pencil, AlertTriangle, Tag } from 'lucide-react';

export const metadata: Metadata = { title: 'Cultural Customs' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

const SEVERITY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  critical:      { label: 'Critical',      bg: '#ffdad6', color: '#93000a' },
  important:     { label: 'Important',     bg: '#fdefd8', color: '#7a4a10' },
  advisable:     { label: 'Advisable',     bg: '#d6e8f0', color: '#2c5a70' },
  informational: { label: 'Informational', bg: '#f3ede2', color: '#424844' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const CATEGORY_LABEL: Record<string, string> = {
  greeting: 'Greeting', dress: 'Dress', dining: 'Dining', religious: 'Religious',
  hospitality: 'Hospitality', gift_giving: 'Gift giving', taboo: 'Taboo',
  driglam_namzha: 'Driglam Namzha', etiquette: 'Etiquette', other: 'Other',
};

export default async function CulturalCustomsPage() {
  const customs = await getCulturalCustoms();

  const bySeverity: Record<string, typeof customs> = {
    critical:      customs.filter(c => c.severity === 'critical'),
    important:     customs.filter(c => c.severity === 'important'),
    advisable:     customs.filter(c => c.severity === 'advisable'),
    informational: customs.filter(c => c.severity === 'informational'),
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Cultural Customs</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {customs.length} customs · grouped by severity · {bySeverity.critical.length} critical · {bySeverity.important.length} important
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add custom" action={async () => {
            'use server';
            const res = await createCulturalCustom();
            if (res.ok && res.id) redirect(`/cultural-customs/${res.id}`);
          }} />
        </div>
      </div>

      <div className="space-y-6">
        {(['critical', 'important', 'advisable', 'informational'] as const).map(level => {
          const items = bySeverity[level];
          const lc = SEVERITY_BADGE[level];
          return (
            <div key={level}>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1 px-3 py-1 rounded-full font-bold uppercase" style={{ ...labelCapsStyle, backgroundColor: lc.bg, color: lc.color, fontSize: '11px' }}>
                  {level === 'critical' && <AlertTriangle size={11} />}
                  {lc.label}
                </span>
                <span className="text-on-surface-variant" style={bodySmStyle}>{items.length} customs</span>
              </div>
              {items.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {items.map(custom => {
                    const cs = CONTENT_STATUS[custom.content_status] ?? CONTENT_STATUS.draft;
                    return (
                      <Link key={custom.id} href={`/cultural-customs/${custom.id}`} className="block group">
                        <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-4 h-full">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded uppercase mt-0.5 bg-surface-container-highest text-on-surface-variant" style={{ ...labelCapsStyle, fontSize: '10px' }}>{CATEGORY_LABEL[custom.category]}</span>
                              <p className="text-on-surface font-bold" style={{ fontSize: '14px' }}>{custom.title_en}</p>
                              <span className="px-1.5 py-0.5 rounded-full uppercase" style={{ ...labelCapsStyle, fontSize: '9px', backgroundColor: cs.bg, color: cs.color }}>{cs.label}</span>
                            </div>
                            <span className="flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-on-primary-fixed-variant flex-shrink-0" style={{ fontSize: '12px' }}>
                              <Pencil size={11} /> Edit
                            </span>
                          </div>
                          {custom.description && (
                            <p className="text-on-surface-variant leading-relaxed mb-2" style={bodySmStyle}>
                              {custom.description.slice(0, 140)}{custom.description.length > 140 ? '…' : ''}
                            </p>
                          )}
                          {custom.applies_in_contexts && custom.applies_in_contexts.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mb-2">
                              <Tag size={10} className="text-on-surface-variant" />
                              {custom.applies_in_contexts.map(ctx => (
                                <span key={ctx} className="px-1.5 py-0.5 rounded text-on-surface-variant bg-surface-container-high" style={{ fontSize: '10px' }}>{ctx}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-outline-variant" style={{ fontSize: '11px' }}>
                            <span className="text-on-surface-variant">
                              {custom.visitor_guidance ? 'Visitor guidance ✓' : 'No visitor guidance'}
                            </span>
                            <span className="text-on-primary-fixed-variant font-semibold">Edit →</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-on-surface-variant" style={bodySmStyle}>No customs at this severity.</p>
              )}
            </div>
          );
        })}
        {customs.length === 0 && (
          <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-on-surface-variant" style={bodyMdStyle}>
            content.cultural_custom is empty.
          </div>
        )}
      </div>
    </div>
  );
}
