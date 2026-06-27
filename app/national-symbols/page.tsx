import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getNationalSymbols } from '@/lib/db';
import { createNationalSymbol } from '@/lib/actions/national-symbols';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download, Pencil } from 'lucide-react';

export const metadata: Metadata = { title: 'National Symbols' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

const KIND_LABEL: Record<string, string> = {
  animal: 'Animal', bird: 'Bird', flower: 'Flower', tree: 'Tree', sport: 'Sport',
  dress_male: 'Dress (male)', dress_female: 'Dress (female)',
  game: 'Game', anthem: 'Anthem', flag: 'Flag', emblem: 'Emblem',
  currency: 'Currency', day: 'National day', other: 'Other',
};

const KIND_ICON: Record<string, string> = {
  animal: '🦌', bird: '🐦‍⬛', flower: '🌸', tree: '🌲', sport: '🏹',
  dress_male: '👘', dress_female: '👘', game: '🎲', anthem: '🎵',
  flag: '🏳️', emblem: '🛡️', currency: '💰', day: '🎉', other: '✨',
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

export default async function NationalSymbolsPage() {
  const symbols = await getNationalSymbols();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>National Symbols</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {symbols.length} catalogued · Bhutan&apos;s official national symbols across 14 kinds
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add symbol" action={async () => {
            'use server';
            const res = await createNationalSymbol();
            if (res.ok && res.id) redirect(`/national-symbols/${res.id}`);
          }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {symbols.map(sym => {
          const cs = CONTENT_STATUS[sym.content_status] ?? CONTENT_STATUS.draft;
          return (
            <Link key={sym.id} href={`/national-symbols/${sym.id}`} className="block group">
              <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-4 h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-container-high text-lg">
                    {KIND_ICON[sym.kind] ?? '✨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded uppercase bg-surface-container-highest text-on-surface-variant" style={{ ...labelCapsStyle, fontSize: '10px' }}>{KIND_LABEL[sym.kind] ?? sym.kind}</span>
                        <p className="text-on-surface font-bold" style={{ fontSize: '15px' }}>{sym.name_en}</p>
                        <span className="px-1.5 py-0.5 rounded-full uppercase" style={{ ...labelCapsStyle, fontSize: '9px', backgroundColor: cs.bg, color: cs.color }}>{cs.label}</span>
                      </div>
                      <span className="flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-on-primary-fixed-variant" style={{ fontSize: '12px' }}>
                        <Pencil size={11} /> Edit
                      </span>
                    </div>
                    {(sym.name_dz || sym.name_romanized) && (
                      <p className="italic text-on-surface-variant mb-2" style={{ fontSize: '12px' }}>
                        {[sym.name_dz, sym.name_romanized].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {sym.description && (
                      <p className="text-on-surface-variant leading-relaxed mb-2" style={bodySmStyle}>
                        {sym.description.slice(0, 140)}{sym.description.length > 140 ? '…' : ''}
                      </p>
                    )}
                    {(sym.species_name || sym.figure_name) && (
                      <div className="flex flex-wrap gap-2" style={{ fontSize: '11px' }}>
                        {sym.species_name && (
                          <span className="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">
                            Species: <span className="italic">{sym.species_name}</span>
                          </span>
                        )}
                        {sym.figure_name && (
                          <span className="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">
                            Figure: {sym.figure_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {symbols.length === 0 && (
          <div className="col-span-2 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-on-surface-variant" style={bodyMdStyle}>
            content.national_symbol is empty.
          </div>
        )}
      </div>
    </div>
  );
}
