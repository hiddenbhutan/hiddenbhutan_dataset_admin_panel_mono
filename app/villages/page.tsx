import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getVillages,
  getVillageCount,
  getVillageStatusCounts,
  getDistrictList,
  SETTLEMENT_KINDS,
  type SettlementKind,
} from '@/lib/db';
import { createVillage } from '@/lib/actions/villages';
import { Card } from '@/components/ui/card';
import { Home, Phone, Utensils } from 'lucide-react';
import VillagesFilterBar from './VillagesFilterBar';
import AddNewForm from '@/components/AddNewForm';

export const metadata: Metadata = { title: 'Villages' };

const PAGE_SIZE = 100;

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

const KIND_LABEL: Record<SettlementKind, string> = {
  village:    'Village',
  hamlet:     'Hamlet',
  settlement: 'Settlement',
  town:       'Town',
  thromde:    'Thromde',
};

function isSettlementKind(v: string | undefined): v is SettlementKind {
  return !!v && (SETTLEMENT_KINDS as readonly string[]).includes(v);
}

function Flag({ value, icon: Icon, label }: { value: number | null; icon: React.ElementType; label: string }) {
  // 1 = yes, 0 = no, null = unknown
  if (value == null) {
    return <span title={`${label}: unknown`} className="inline-flex items-center justify-center w-6 h-6 rounded text-[#c2c8c2]"><Icon size={13} /></span>;
  }
  return (
    <span title={`${label}: ${value ? 'yes' : 'no'}`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded ${value ? 'text-[#304d3e]' : 'text-[#c2c8c2]'}`}>
      <Icon size={13} />
    </span>
  );
}

type SearchParams = Promise<{
  page?: string;
  district?: string;
  kind?: string;
  status?: string;
  q?: string;
  acc?: string;
  food?: string;
  phone?: string;
}>;

export default async function VillagesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const filter = {
    district: sp.district && sp.district !== 'all' ? sp.district : undefined,
    kind: isSettlementKind(sp.kind) ? sp.kind : undefined,
    contentStatus: (sp.status && sp.status !== 'all'
      ? sp.status
      : 'all') as 'draft' | 'in_review' | 'published' | 'archived' | 'all',
    hasAccommodation: sp.acc === '1',
    hasFood:          sp.food === '1',
    hasPhone:         sp.phone === '1',
    search: sp.q || undefined,
  };

  const [rows, total, statusCounts, districts] = await Promise.all([
    getVillages(filter, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getVillageCount(filter),
    getVillageStatusCounts(),
    getDistrictList(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  function withPage(p: number) {
    const params = new URLSearchParams();
    if (filter.district)             params.set('district', filter.district);
    if (filter.kind)                 params.set('kind', filter.kind);
    if (filter.contentStatus !== 'all') params.set('status', filter.contentStatus);
    if (filter.hasAccommodation)     params.set('acc', '1');
    if (filter.hasFood)              params.set('food', '1');
    if (filter.hasPhone)             params.set('phone', '1');
    if (filter.search)               params.set('q', filter.search);
    if (p > 1)                       params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/villages?${qs}` : '/villages';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
            Villages
          </h1>
          <p className="text-on-surface-variant mt-1" style={{ fontSize: '14px' }}>
            {statusCounts.total.toLocaleString()} settlements across {districts.length} districts · {statusCounts.published.toLocaleString()} published · {statusCounts.with_accommodation.toLocaleString()} with accommodation · {statusCounts.with_food.toLocaleString()} with food · {statusCounts.with_phone.toLocaleString()} with phone signal
          </p>
        </div>
        <AddNewForm label="Add village" action={async () => {
          'use server';
          const res = await createVillage();
          if (res.ok && res.id) redirect(`/villages/${res.id}`);
        }} />
      </div>

      <VillagesFilterBar
        districts={districts}
        initial={{
          district: filter.district ?? 'all',
          kind:     filter.kind ?? 'all',
          status:   filter.contentStatus,
          q:        filter.search ?? '',
          acc:      filter.hasAccommodation,
          food:     filter.hasFood,
          phone:    filter.hasPhone,
        }}
      />

      <Card className="border-[#c2c8c2] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: '#ede8dd' }}>
              <tr className="border-b border-[#c2c8c2]">
                {['#', 'Name', 'Kind', 'District / Gewog', 'Chiwog', 'Population', 'Elev.', 'Services', 'Workflow'].map(h => (
                  <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d7]">
              {rows.map(v => {
                const cs = CONTENT_STATUS[v.content_status] ?? CONTENT_STATUS.draft;
                return (
                  <tr key={v.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-4 py-2 font-mono text-[#727973]" style={{ fontSize: '11px' }}>{v.id}</td>
                    <td className="px-4 py-2">
                      <Link href={`/villages/${v.id}`} className="font-semibold text-[#1d1c15] hover:text-on-primary-fixed-variant block" style={{ fontSize: '13px' }}>{v.name}</Link>
                      {(v.name_dz || v.name_romanized) && (
                        <div className="text-[#727973]" style={{ fontSize: '11px' }}>
                          {[v.name_dz, v.name_romanized].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {v.name_meaning && <div className="text-[#727973] italic" style={{ fontSize: '11px' }}>“{v.name_meaning}”</div>}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#ede8dd', color: '#304d3e', fontSize: '11px' }}>
                        {KIND_LABEL[v.kind as SettlementKind] ?? v.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[#424844]" style={{ fontSize: '12px' }}>
                      {v.district}
                      {v.gewog && <span className="text-[#727973]"> · {v.gewog}</span>}
                    </td>
                    <td className="px-4 py-2 text-[#727973]" style={{ fontSize: '12px' }}>{v.chiwog || '—'}</td>
                    <td className="px-4 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>
                      {v.pop_total != null ? (
                        <div>
                          <div>{v.pop_total.toLocaleString()}</div>
                          {(v.pop_male != null || v.pop_female != null) && (
                            <div className="text-[#727973]" style={{ fontSize: '10px' }}>
                              {v.pop_male != null ? `♂${v.pop_male.toLocaleString()}` : ''}
                              {v.pop_male != null && v.pop_female != null ? ' · ' : ''}
                              {v.pop_female != null ? `♀${v.pop_female.toLocaleString()}` : ''}
                              {v.pop_year ? ` (${v.pop_year})` : ''}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>
                      {v.elevation_m != null ? `${v.elevation_m.toLocaleString()} m` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-0.5">
                        <Flag value={v.has_accommodation} icon={Home}     label="Accommodation" />
                        <Flag value={v.has_food_supply}   icon={Utensils} label="Food supply" />
                        <Flag value={v.has_phone_signal}  icon={Phone}    label="Phone signal" />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>No villages match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#e8e2d7] flex items-center justify-between" style={{ backgroundColor: '#f9f3e8' }}>
          <p className="text-[#727973]" style={{ fontSize: '13px' }}>
            {total === 0 ? 'No results' : `${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-1" style={{ fontSize: '12px' }}>
            {page > 1 ? (
              <Link href={withPage(page - 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>← Prev</Link>
            ) : (
              <span className="px-3 py-1 rounded text-[#c2c8c2]">← Prev</span>
            )}
            <span className="text-[#727973] px-2">Page {page} of {totalPages}</span>
            {page < totalPages ? (
              <Link href={withPage(page + 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>Next →</Link>
            ) : (
              <span className="px-3 py-1 rounded text-[#c2c8c2]">Next →</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
