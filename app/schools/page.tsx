import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getSchools,
  getSchoolCount,
  getSchoolStatusCounts,
  getDistrictList,
} from '@/lib/db';
import type { SchoolCategory } from '@/lib/db';
import { createSchool } from '@/lib/actions/schools';
import { Card } from '@/components/ui/card';
import SchoolsFilterBar from './SchoolsFilterBar';
import AddNewForm from '@/components/AddNewForm';

export const metadata: Metadata = { title: 'Schools' };

const PAGE_SIZE = 100;

const CATEGORY_LABEL: Record<SchoolCategory, string> = {
  community_primary: 'Community primary',
  primary:           'Primary',
  lower_secondary:   'Lower secondary',
  middle_secondary:  'Middle secondary',
  higher_secondary:  'Higher secondary',
  autonomous:        'Autonomous',
  private:           'Private',
  monastic:          'Monastic',
  institute:         'Institute',
  other:             'Other',
};

const CATEGORY_BADGE: Record<SchoolCategory, { bg: string; color: string }> = {
  community_primary: { bg: '#f3ede2', color: '#424844' },
  primary:           { bg: '#dae69f', color: '#5d682e' },
  lower_secondary:   { bg: '#d6e8f0', color: '#2c5a70' },
  middle_secondary:  { bg: '#304d3e', color: '#ffdea3' },
  higher_secondary:  { bg: '#082619', color: '#ffdea3' },
  autonomous:        { bg: '#ffdea3', color: '#261900' },
  private:           { bg: '#e6dff0', color: '#4a3370' },
  monastic:          { bg: '#fdefd8', color: '#7a4a10' },
  institute:         { bg: '#c9ead6', color: '#1a4d2a' },
  other:             { bg: '#e8e2d7', color: '#424844' },
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
  category?: SchoolCategory | 'all';
  status?: string;
  hostel?: string;
  q?: string;
}>;

export default async function SchoolsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const filter = {
    district: sp.district && sp.district !== 'all' ? sp.district : undefined,
    category: sp.category && sp.category !== 'all' ? sp.category : undefined,
    contentStatus: (sp.status && sp.status !== 'all'
      ? sp.status
      : 'all') as 'draft' | 'in_review' | 'published' | 'archived' | 'all',
    hostelOnly: sp.hostel === '1',
    search: sp.q || undefined,
  };

  const [rows, total, statusCounts, districts] = await Promise.all([
    getSchools(filter, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getSchoolCount(filter),
    getSchoolStatusCounts(),
    getDistrictList(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  function withPage(p: number) {
    const params = new URLSearchParams();
    if (filter.district) params.set('district', filter.district);
    if (filter.category) params.set('category', filter.category);
    if (filter.contentStatus !== 'all') params.set('status', filter.contentStatus);
    if (filter.hostelOnly) params.set('hostel', '1');
    if (filter.search) params.set('q', filter.search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/schools?${qs}` : '/schools';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
            Schools
          </h1>
          <p className="text-on-surface-variant mt-1" style={{ fontSize: '14px' }}>
            {statusCounts.total.toLocaleString()} educational institutions · {statusCounts.published.toLocaleString()} published · {statusCounts.draft.toLocaleString()} draft · {statusCounts.with_hostel.toLocaleString()} with hostel
          </p>
        </div>
        <AddNewForm label="Add school" action={async () => {
          'use server';
          const res = await createSchool();
          if (res.ok && res.id) redirect(`/schools/${res.id}`);
        }} />
      </div>

      <SchoolsFilterBar
        districts={districts}
        initial={{
          district: filter.district ?? 'all',
          category: (filter.category ?? 'all') as SchoolCategory | 'all',
          status:   filter.contentStatus,
          hostel:   filter.hostelOnly,
          q:        filter.search ?? '',
        }}
      />

      <Card className="border-[#c2c8c2] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: '#ede8dd' }}>
              <tr className="border-b border-[#c2c8c2]">
                {['#', 'School', 'Category', 'District / Gewog', 'Chiwog', 'Students', 'Capacity', 'Elev.', 'Hostel', 'Workflow'].map(h => (
                  <th key={h} className="px-3 py-2.5 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d7]">
              {rows.map(s => {
                const cat = s.category ? CATEGORY_BADGE[s.category] : null;
                const cs = CONTENT_STATUS[s.content_status] ?? CONTENT_STATUS.draft;
                return (
                  <tr key={s.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-3 py-2 font-mono text-[#727973]" style={{ fontSize: '11px' }}>{s.id}</td>
                    <td className="px-3 py-2" style={{ fontSize: '13px' }}>
                      <Link href={`/schools/${s.id}`} className="font-semibold text-[#1d1c15] hover:text-on-primary-fixed-variant">{s.name}</Link>
                    </td>
                    <td className="px-3 py-2">
                      {s.category && cat ? (
                        <span className="px-2 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: cat.bg, color: cat.color, fontSize: '10px' }}>
                          {CATEGORY_LABEL[s.category]}
                        </span>
                      ) : <span className="text-[#c2c8c2]" style={{ fontSize: '12px' }}>—</span>}
                    </td>
                    <td className="px-3 py-2 text-[#424844]" style={{ fontSize: '12px' }}>
                      {s.district}
                      {s.gewog && <span className="text-[#727973]"> · {s.gewog}</span>}
                    </td>
                    <td className="px-3 py-2 text-[#727973]" style={{ fontSize: '12px' }}>{s.chiwog || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>
                      {s.students_total != null ? (
                        <div>
                          <div>{s.students_total.toLocaleString()}</div>
                          {(s.students_male != null || s.students_female != null) && (
                            <div className="text-[#727973]" style={{ fontSize: '10px' }}>
                              {s.students_male != null ? `♂${s.students_male.toLocaleString()}` : ''}
                              {s.students_male != null && s.students_female != null ? ' · ' : ''}
                              {s.students_female != null ? `♀${s.students_female.toLocaleString()}` : ''}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>{s.capacity != null ? s.capacity.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 font-mono text-[#424844]" style={{ fontSize: '12px' }}>{s.elevation_m != null ? `${s.elevation_m.toLocaleString()} m` : '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {s.has_hostel ? (
                        <span className="px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: '#c9ead6', color: '#1a4d2a', fontSize: '10px' }}>YES</span>
                      ) : <span className="text-[#c2c8c2]">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>No schools match these filters.</td></tr>
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
