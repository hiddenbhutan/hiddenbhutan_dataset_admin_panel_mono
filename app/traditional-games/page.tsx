import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTraditionalGames } from '@/lib/db';
import { createTraditionalGame } from '@/lib/actions/traditional-games';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download, Pencil, Crown } from 'lucide-react';

export const metadata: Metadata = { title: 'Traditional Games' };

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

function parseInt4Range(range: string | null): { min: number | null; max: number | null } {
  if (!range) return { min: null, max: null };
  const m = range.match(/^[\[\(](\d*),(\d*)[\]\)]$/);
  if (!m) return { min: null, max: null };
  const [_, lo, hi] = m;
  return {
    min: lo === '' ? null : Number(lo) + (range.startsWith('(') ? 1 : 0),
    max: hi === '' ? null : Number(hi) - (range.endsWith(')')   ? 1 : 0),
  };
}

export default async function TraditionalGamesPage() {
  const games = await getTraditionalGames();
  const competitive = games.filter(g => g.is_competitive).length;
  const nationalSport = games.filter(g => g.is_national_sport).length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Traditional Games</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {games.length} games · {competitive} competitive · {nationalSport} national sport
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add game" action={async () => {
            'use server';
            const res = await createTraditionalGame();
            if (res.ok && res.id) redirect(`/traditional-games/${res.id}`);
          }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {games.map(game => {
          const players = parseInt4Range(game.typical_players);
          const cs = CONTENT_STATUS[game.content_status] ?? CONTENT_STATUS.draft;
          return (
            <Link key={game.id} href={`/traditional-games/${game.id}`} className="block group">
              <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-4 h-full">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {game.is_national_sport ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ ...labelCapsStyle, fontSize: '10px' }}>
                          <Crown size={11} /> National sport
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded uppercase" style={{
                          ...labelCapsStyle, fontSize: '11px',
                          backgroundColor: game.is_competitive ? '#dae69f' : '#e8e2d7',
                          color: game.is_competitive ? '#5d682e' : '#424844',
                        }}>
                          {game.is_competitive ? 'Competitive' : 'Casual'}
                        </span>
                      )}
                      <p className="text-on-surface font-bold" style={{ fontSize: '16px' }}>{game.name_en}</p>
                      <span className="px-1.5 py-0.5 rounded-full uppercase" style={{ ...labelCapsStyle, fontSize: '9px', backgroundColor: cs.bg, color: cs.color }}>{cs.label}</span>
                    </div>
                    {(game.name_dz || game.name_romanized) && (
                      <p className="italic text-on-surface-variant" style={{ fontSize: '12px' }}>
                        {[game.name_dz, game.name_romanized].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-on-primary-fixed-variant flex-shrink-0" style={{ fontSize: '12px' }}>
                    <Pencil size={11} /> Edit
                  </span>
                </div>
                {game.description && (
                  <p className="text-on-surface-variant leading-relaxed mb-3" style={bodySmStyle}>
                    {game.description.slice(0, 160)}{game.description.length > 160 ? '…' : ''}
                  </p>
                )}
                <div className="space-y-1 mb-3">
                  {game.equipment && <p className="text-on-surface-variant" style={{ fontSize: '12px' }}><span className="font-semibold">Equipment:</span> {game.equipment}</p>}
                  {(players.min != null || players.max != null) && (
                    <p className="text-on-surface-variant" style={{ fontSize: '12px' }}>
                      <span className="font-semibold">Players:</span>{' '}
                      {players.min != null && players.max != null
                        ? `${players.min}–${players.max}`
                        : players.min != null
                          ? `${players.min}+`
                          : `≤${players.max}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <span className="text-on-surface-variant" style={{ fontSize: '11px' }}>{game.season ?? 'Year-round'}</span>
                  <span className="text-on-primary-fixed-variant font-semibold" style={{ fontSize: '12px' }}>View &amp; edit →</span>
                </div>
              </div>
            </Link>
          );
        })}
        {games.length === 0 && (
          <div className="col-span-2 border border-outline-variant bg-surface-container-low rounded-xl shadow-none p-8 text-center text-on-surface-variant" style={bodyMdStyle}>
            content.traditional_game is empty.
          </div>
        )}
      </div>
    </div>
  );
}
