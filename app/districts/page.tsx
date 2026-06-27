import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getDzongkhags,
  getGewogs,
  getChiwogs,
  getChiwogCount,
} from '@/lib/db';
import type { AdminRegion } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChiwogsFilterBar from './ChiwogsFilterBar';

export const metadata: Metadata = { title: 'Administrative Divisions' };

const PAGE_SIZE = 200;

const REGION_LABEL: Record<AdminRegion, string> = {
  east:    'East',
  west:    'West',
  central: 'Central',
  south:   'South',
};

const REGION_BADGE: Record<AdminRegion, { bg: string; color: string }> = {
  east:    { bg: '#fdefd8', color: '#7a4a10' },
  west:    { bg: '#d6e8f0', color: '#2c5a70' },
  central: { bg: '#dae69f', color: '#5d682e' },
  south:   { bg: '#ffdea3', color: '#261900' },
};

function StatBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center px-3">
      <p className="font-bold text-[#1d1c15]" style={{ fontSize: '22px' }}>{n.toLocaleString()}</p>
      <p className="text-[#727973] uppercase tracking-wide" style={{ fontSize: '10px' }}>{label}</p>
    </div>
  );
}

type SearchParams = Promise<{
  page?: string;
  dz?: string;
  gewog?: string;
  q?: string;
}>;

export default async function DistrictsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const chiwogFilter = {
    dzongkhag: sp.dz && sp.dz !== 'all' ? sp.dz : undefined,
    gewog: sp.gewog && sp.gewog !== 'all' ? sp.gewog : undefined,
    search: sp.q || undefined,
  };

  const [dzongkhags, gewogs, chiwogs, chiwogTotal] = await Promise.all([
    getDzongkhags(),
    getGewogs(),
    getChiwogs(chiwogFilter, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getChiwogCount(chiwogFilter),
  ]);

  const totalChiwogs = dzongkhags.reduce((s, d) => s + d.chiwog_count, 0);
  const totalChiwogPagePages = Math.max(1, Math.ceil(chiwogTotal / PAGE_SIZE));
  const startIdx = chiwogTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, chiwogTotal);

  // Group dzongkhags by region for the dzongkhag tab.
  const byRegion = (['west', 'central', 'east', 'south'] as const).map(region => ({
    region,
    items: dzongkhags.filter(d => d.region === region),
  }));
  const unassigned = dzongkhags.filter(d => d.region == null);

  function withPage(p: number) {
    const params = new URLSearchParams();
    if (chiwogFilter.dzongkhag) params.set('dz', chiwogFilter.dzongkhag);
    if (chiwogFilter.gewog)     params.set('gewog', chiwogFilter.gewog);
    if (chiwogFilter.search)    params.set('q', chiwogFilter.search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/districts?${qs}` : '/districts';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
            Administrative Divisions
          </h1>
          <p className="text-on-surface-variant mt-1" style={{ fontSize: '14px' }}>
            Bhutan&apos;s three-tier administrative structure — Dzongkhag → Gewog → Chiwog
          </p>
        </div>
        <Link href="/reference/dzongkhag"
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface"
          style={{ fontSize: '14px', fontWeight: 600 }}>
          Edit dzongkhags →
        </Link>
      </div>

      <Card className="border-[#c2c8c2] bg-white">
        <CardContent className="p-4 flex items-center gap-2 divide-x divide-[#e8e2d7]">
          <StatBadge n={dzongkhags.length} label="Dzongkhags (Districts)" />
          <StatBadge n={gewogs.length}     label="Gewogs (Sub-districts)" />
          <StatBadge n={totalChiwogs}      label="Chiwogs (Village blocks)" />
        </CardContent>
      </Card>

      <Tabs defaultValue="dzongkhag">
        <TabsList className="bg-[#f9f3e8] border border-[#c2c8c2] rounded-xl p-1 gap-1">
          <TabsTrigger value="dzongkhag" className="data-[state=active]:bg-[#304d3e] data-[state=active]:text-[#ffdea3] data-[state=inactive]:text-[#424844] rounded-lg" style={{ fontSize: '13px' }}>
            Dzongkhag ({dzongkhags.length})
          </TabsTrigger>
          <TabsTrigger value="gewog" className="data-[state=active]:bg-[#304d3e] data-[state=active]:text-[#ffdea3] data-[state=inactive]:text-[#424844] rounded-lg" style={{ fontSize: '13px' }}>
            Gewog ({gewogs.length})
          </TabsTrigger>
          <TabsTrigger value="chiwog" className="data-[state=active]:bg-[#304d3e] data-[state=active]:text-[#ffdea3] data-[state=inactive]:text-[#424844] rounded-lg" style={{ fontSize: '13px' }}>
            Chiwog ({totalChiwogs.toLocaleString()})
          </TabsTrigger>
        </TabsList>

        {/* ── DZONGKHAG ─────────────────────────────────── */}
        <TabsContent value="dzongkhag" className="mt-4 space-y-5">
          {byRegion.map(({ region, items }) => items.length === 0 ? null : (
            <div key={region}>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full font-bold uppercase" style={{ backgroundColor: REGION_BADGE[region].bg, color: REGION_BADGE[region].color, fontSize: '11px' }}>{REGION_LABEL[region]} region</span>
                <span className="text-[#727973]" style={{ fontSize: '12px' }}>{items.length} dzongkhags</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {items.map(d => (
                  <Card key={d.id} className="border-[#c2c8c2] bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-[#1d1c15]" style={{ fontSize: '15px' }}>{d.name}</p>
                        <span className="font-mono text-[#727973]" style={{ fontSize: '11px' }}>{d.code ? d.code : `#${d.id}`}</span>
                      </div>
                      {d.name_dz && <p className="italic text-[#727973] mb-2" style={{ fontSize: '12px' }}>{d.name_dz}</p>}
                      <div className="flex gap-3 mt-2">
                        <div className="text-center">
                          <p className="font-bold text-[#304d3e]" style={{ fontSize: '18px' }}>{d.gewog_count}</p>
                          <p className="text-[#727973]" style={{ fontSize: '10px' }}>Gewogs</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-[#304d3e]" style={{ fontSize: '18px' }}>{d.chiwog_count}</p>
                          <p className="text-[#727973]" style={{ fontSize: '10px' }}>Chiwogs</p>
                        </div>
                        {d.population_total != null && (
                          <div className="text-center">
                            <p className="font-bold text-[#304d3e] font-mono" style={{ fontSize: '14px' }}>{d.population_total.toLocaleString()}</p>
                            <p className="text-[#727973]" style={{ fontSize: '10px' }}>Population</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full font-bold uppercase" style={{ backgroundColor: '#e8e2d7', color: '#424844', fontSize: '11px' }}>Region unassigned</span>
                <span className="text-[#727973]" style={{ fontSize: '12px' }}>{unassigned.length} dzongkhag{unassigned.length === 1 ? '' : 's'}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {unassigned.map(d => (
                  <Card key={d.id} className="border-[#c2c8c2] bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-[#1d1c15]" style={{ fontSize: '15px' }}>{d.name}</p>
                        <span className="font-mono text-[#727973]" style={{ fontSize: '11px' }}>{d.code ?? `#${d.id}`}</span>
                      </div>
                      {d.name_dz && <p className="italic text-[#727973]" style={{ fontSize: '12px' }}>{d.name_dz}</p>}
                      <p className="text-[#7a4a10] mt-2" style={{ fontSize: '11px' }}>ref.dzongkhag.region not set</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── GEWOG ─────────────────────────────────────── */}
        <TabsContent value="gewog" className="mt-4">
          <Card className="border-[#c2c8c2] bg-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead style={{ backgroundColor: '#ede8dd' }}>
                <tr className="border-b border-[#c2c8c2]">
                  {['#', 'Code', 'Gewog', 'Dzongkhag', 'Chiwogs', 'Population'].map(h => (
                    <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d7]">
                {gewogs.map(g => (
                  <tr key={g.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-4 py-2 font-mono text-[#727973]" style={{ fontSize: '12px' }}>{g.id}</td>
                    <td className="px-4 py-2 font-mono text-[#304d3e]" style={{ fontSize: '11px' }}>{g.code ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-[#1d1c15]" style={{ fontSize: '14px' }}>{g.name}</div>
                      {g.name_dz && <div className="text-[#727973]" style={{ fontSize: '11px' }}>{g.name_dz}</div>}
                    </td>
                    <td className="px-4 py-2 text-[#424844]" style={{ fontSize: '13px' }}>{g.dzongkhag}</td>
                    <td className="px-4 py-2 font-mono text-[#304d3e] font-bold" style={{ fontSize: '13px' }}>{g.chiwog_count}</td>
                    <td className="px-4 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>{g.population_total != null ? g.population_total.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* ── CHIWOG ────────────────────────────────────── */}
        <TabsContent value="chiwog" className="mt-4 space-y-4">
          <ChiwogsFilterBar
            dzongkhags={dzongkhags.map(d => d.name)}
            gewogs={gewogs.map(g => g.name)}
            initial={{
              dz:    chiwogFilter.dzongkhag ?? 'all',
              gewog: chiwogFilter.gewog     ?? 'all',
              q:     chiwogFilter.search    ?? '',
            }}
          />
          <Card className="border-[#c2c8c2] bg-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead style={{ backgroundColor: '#ede8dd' }}>
                <tr className="border-b border-[#c2c8c2]">
                  {['#', 'NSB code', 'Chiwog', 'Gewog', 'Dzongkhag', 'Population'].map(h => (
                    <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d7]">
                {chiwogs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-4 py-2 font-mono text-[#727973]" style={{ fontSize: '12px' }}>{c.id}</td>
                    <td className="px-4 py-2 font-mono text-[#304d3e]" style={{ fontSize: '11px' }}>{c.nsb_code ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-[#1d1c15]" style={{ fontSize: '13px' }}>{c.name}</div>
                      {c.name_dz && <div className="text-[#727973]" style={{ fontSize: '11px' }}>{c.name_dz}</div>}
                    </td>
                    <td className="px-4 py-2 text-[#424844]" style={{ fontSize: '13px' }}>{c.gewog}</td>
                    <td className="px-4 py-2 text-[#424844]" style={{ fontSize: '13px' }}>{c.dzongkhag}</td>
                    <td className="px-4 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>
                      {c.population != null ? (
                        <>
                          {c.population.toLocaleString()}
                          {c.population_year && <span className="text-[#727973] ml-1" style={{ fontSize: '10px' }}>({c.population_year})</span>}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {chiwogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>No chiwogs match these filters.</td></tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-[#e8e2d7] flex items-center justify-between" style={{ backgroundColor: '#f9f3e8' }}>
              <p className="text-[#727973]" style={{ fontSize: '13px' }}>
                {chiwogTotal === 0 ? 'No results' : `${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${chiwogTotal.toLocaleString()}`}
              </p>
              <div className="flex items-center gap-1" style={{ fontSize: '12px' }}>
                {page > 1 ? (
                  <Link href={withPage(page - 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>← Prev</Link>
                ) : <span className="px-3 py-1 rounded text-[#c2c8c2]">← Prev</span>}
                <span className="text-[#727973] px-2">Page {page} of {totalChiwogPagePages}</span>
                {page < totalChiwogPagePages ? (
                  <Link href={withPage(page + 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>Next →</Link>
                ) : <span className="px-3 py-1 rounded text-[#c2c8c2]">Next →</span>}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
