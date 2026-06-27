import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getHealthCenters,
  getHealthCenterCount,
  getHealthCenterStatusCounts,
  getDistrictList,
} from '@/lib/db';
import type { HealthCenterType, HealthCenterStatus } from '@/lib/db';
import { createHealthCenter } from '@/lib/actions/health-centers';
import { Card } from '@/components/ui/card';
import HealthCentersFilterBar from './HealthCentersFilterBar';
import AddNewForm from '@/components/AddNewForm';

export const metadata: Metadata = { title: 'Health Centers' };

const PAGE_SIZE = 100;

// Keyed by ref.health_center_type.code. Falls back to `other` / the raw code
// for any type added via the Reference Editor that isn't styled here yet.
const TYPE_LABEL: Record<string, string> = {
  orc:                        'ORC',
  sub_post:                   'Sub-post',
  bhu_2:                      'BHU II',
  bhu_1:                      'BHU I',
  phc:                        'PHC',
  district_hospital:          'District hospital',
  regional_referral_hospital: 'Regional referral',
  national_referral_hospital: 'National referral',
  other:                      'Other',
};

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  orc:                        { bg: '#f3ede2', color: '#424844' },
  sub_post:                   { bg: '#f3ede2', color: '#424844' },
  bhu_2:                      { bg: '#dae69f', color: '#5d682e' },
  bhu_1:                      { bg: '#d6e8f0', color: '#2c5a70' },
  phc:                        { bg: '#fdefd8', color: '#7a4a10' },
  district_hospital:          { bg: '#ffdad6', color: '#93000a' },
  regional_referral_hospital: { bg: '#ffdad6', color: '#52001a' },
  national_referral_hospital: { bg: '#7a1a2a', color: '#fff' },
  other:                      { bg: '#e8e2d7', color: '#727973' },
};

const OPSTATUS_BADGE: Record<HealthCenterStatus, { label: string; bg: string; color: string }> = {
  operational:        { label: 'Operational',        bg: '#c9ead6', color: '#1a4d2a' },
  temporarily_closed: { label: 'Temp. closed',       bg: '#fdefd8', color: '#7a4a10' },
  under_construction: { label: 'Under construction', bg: '#d6e8f0', color: '#2c5a70' },
  permanently_closed: { label: 'Closed',             bg: '#ffdad6', color: '#93000a' },
  unknown:            { label: 'Unknown',            bg: '#e8e2d7', color: '#727973' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

type SearchParams = Promise<{
  page?: string;
  district?: string;
  type?: HealthCenterType;
  ostatus?: HealthCenterStatus;
  status?: string;
  helipad?: string;
  fourwd?: string;
  q?: string;
}>;

export default async function HealthCentersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const filter = {
    district: sp.district && sp.district !== 'all' ? sp.district : undefined,
    type: sp.type as HealthCenterType | undefined,
    status: sp.ostatus as HealthCenterStatus | undefined,
    contentStatus: (sp.status && sp.status !== 'all'
      ? sp.status
      : 'all') as 'draft' | 'in_review' | 'published' | 'archived' | 'all',
    helipadOnly: sp.helipad === '1',
    fourwdOnly:  sp.fourwd === '1',
    search: sp.q || undefined,
  };

  const [rows, total, statusCounts, districts] = await Promise.all([
    getHealthCenters(filter, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getHealthCenterCount(filter),
    getHealthCenterStatusCounts(),
    getDistrictList(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  function withPage(p: number) {
    const params = new URLSearchParams();
    if (filter.district) params.set('district', filter.district);
    if (filter.type) params.set('type', filter.type);
    if (filter.status) params.set('ostatus', filter.status);
    if (filter.contentStatus !== 'all') params.set('status', filter.contentStatus);
    if (filter.helipadOnly) params.set('helipad', '1');
    if (filter.fourwdOnly)  params.set('fourwd', '1');
    if (filter.search) params.set('q', filter.search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/health-centers?${qs}` : '/health-centers';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
            Health Centers
          </h1>
          <p className="text-on-surface-variant mt-1" style={{ fontSize: '14px' }}>
            {statusCounts.total.toLocaleString()} facilities · {statusCounts.operational.toLocaleString()} operational · {statusCounts.published.toLocaleString()} published · {statusCounts.with_helipad.toLocaleString()} with helipad · {statusCounts.requires_4wd.toLocaleString()} require 4WD
          </p>
        </div>
        <AddNewForm label="Add health center" action={async () => {
          'use server';
          const res = await createHealthCenter();
          if (res.ok && res.id) redirect(`/health-centers/${res.id}`);
        }} />
      </div>

      <HealthCentersFilterBar
        districts={districts}
        initial={{
          district: filter.district ?? 'all',
          type:     filter.type     ?? 'all',
          ostatus:  filter.status   ?? 'all',
          status:   filter.contentStatus,
          helipad:  filter.helipadOnly,
          fourwd:   filter.fourwdOnly,
          q:        filter.search ?? '',
        }}
      />

      <Card className="border-[#c2c8c2] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: '#ede8dd' }}>
              <tr className="border-b border-[#c2c8c2]">
                {['#', 'Name', 'Type', 'Op. status', 'District / Gewog', 'Beds', 'Est.', 'Elev.', 'Access', 'Services', 'Workflow'].map(h => (
                  <th key={h} className="px-3 py-2.5 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d7]">
              {rows.map(h => {
                const tb = TYPE_BADGE[h.type] ?? TYPE_BADGE.other;
                const ob = OPSTATUS_BADGE[h.status];
                const cs = CONTENT_STATUS[h.content_status] ?? CONTENT_STATUS.draft;
                return (
                  <tr key={h.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-3 py-2 font-mono text-[#727973]" style={{ fontSize: '11px' }}>{h.id}</td>
                    <td className="px-3 py-2">
                      <Link href={`/health-centers/${h.id}`} className="font-semibold text-[#1d1c15] hover:text-on-primary-fixed-variant block" style={{ fontSize: '13px' }}>{h.name}</Link>
                      {h.name_dz && <div className="text-[#727973]" style={{ fontSize: '11px' }}>{h.name_dz}</div>}
                      {h.name_old && <div className="text-[#727973] italic" style={{ fontSize: '10px' }}>was: {h.name_old}</div>}
                      {h.village && <div className="text-[#727973]" style={{ fontSize: '11px' }}>near {h.village}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap" style={{ backgroundColor: tb.bg, color: tb.color, fontSize: '10px' }}>{TYPE_LABEL[h.type] ?? h.type}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap" style={{ backgroundColor: ob.bg, color: ob.color, fontSize: '10px' }}>{ob.label}</span>
                    </td>
                    <td className="px-3 py-2 text-[#424844]" style={{ fontSize: '12px' }}>
                      {h.district}
                      {h.gewog && <span className="text-[#727973]"> · {h.gewog}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#424844] text-center" style={{ fontSize: '12px' }}>{h.beds ?? '—'}</td>
                    <td className="px-3 py-2 text-[#424844]" style={{ fontSize: '11px' }}>{h.year_established ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-[#424844]" style={{ fontSize: '11px' }}>
                      {h.elevation_m != null ? `${h.elevation_m.toLocaleString()} m` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {h.has_helipad ? (
                          <span title="Helipad" className="px-1 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '9px' }}>Heli</span>
                        ) : null}
                        {h.requires_4wd_access ? (
                          <span title="Requires 4WD" className="px-1 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#fdefd8', color: '#7a4a10', fontSize: '9px' }}>4WD</span>
                        ) : null}
                        {h.nearest_road_access_km != null && (
                          <span title="Distance to road" className="px-1 py-0.5 rounded text-[#727973] font-mono" style={{ backgroundColor: '#ede8dd', fontSize: '9px' }}>
                            {h.nearest_road_access_km.toFixed(1)}km
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {h.has_emergency ? <span className="px-1 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#ffdad6', color: '#93000a', fontSize: '9px' }}>ER</span> : null}
                        {h.has_ambulance ? <span className="px-1 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#d6e8f0', color: '#2c5a70', fontSize: '9px' }}>Amb</span> : null}
                        <span className="text-[#727973] font-mono" style={{ fontSize: '10px' }}>·{h.service_count}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>No health centers match these filters.</td></tr>
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
            ) : <span className="px-3 py-1 rounded text-[#c2c8c2]">← Prev</span>}
            <span className="text-[#727973] px-2">Page {page} of {totalPages}</span>
            {page < totalPages ? (
              <Link href={withPage(page + 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>Next →</Link>
            ) : <span className="px-3 py-1 rounded text-[#c2c8c2]">Next →</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
