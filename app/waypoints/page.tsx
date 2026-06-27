import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getWaypoints,
  getWaypointCounts,
  getWaypointCategoryCounts,
  getDistrictList,
} from '@/lib/db';
import { createWaypoint } from '@/lib/actions/waypoints';
import { Card } from '@/components/ui/card';
import WaypointsFilterBar from './WaypointsFilterBar';
import AddNewForm from '@/components/AddNewForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Waypoints' };

const PAGE_SIZE = 50;

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  trail: { bg: '#c9ead6', color: '#032014' },
  water: { bg: '#d6e8f0', color: '#2c5a70' },
  landmark: { bg: '#ffdea3', color: '#261900' },
  facility: { bg: '#dae69f', color: '#5d682e' },
  nature: { bg: '#c9ead6', color: '#032014' },
  cultural: { bg: '#fdefd8', color: '#7a4a10' },
  infrastructure: { bg: '#e8e2d7', color: '#424844' },
  safety: { bg: '#ffdad6', color: '#93000a' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

type SearchParams = Promise<{
  page?: string;
  category?: string;
  district?: string;
  status?: string;
  q?: string;
}>;

export default async function WaypointsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const filter = {
    category: sp.category && sp.category !== 'all' ? sp.category : undefined,
    district: sp.district && sp.district !== 'all' ? sp.district : undefined,
    contentStatus: (sp.status && sp.status !== 'all'
      ? sp.status
      : 'all') as 'draft' | 'in_review' | 'published' | 'archived' | 'all',
    search: sp.q || undefined,
  };

  const [rows, total, byCategory, districts] = await Promise.all([
    getWaypoints(PAGE_SIZE, (page - 1) * PAGE_SIZE, filter),
    getWaypointCounts(filter),
    getWaypointCategoryCounts(),
    getDistrictList(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  // Build URLs that preserve other filters.
  function withPage(p: number) {
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.district) params.set('district', filter.district);
    if (filter.contentStatus !== 'all') params.set('status', filter.contentStatus);
    if (filter.search) params.set('q', filter.search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/waypoints?${qs}` : '/waypoints';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
            Waypoints
          </h1>
          <p className="text-on-surface-variant mt-1" style={{ fontSize: '14px' }}>
            {total.toLocaleString()} waypoints {filter.category || filter.district || filter.contentStatus !== 'all' || filter.search ? '(filtered)' : 'across all routes'} — campsites, passes, bridges, landmarks &amp; more
          </p>
        </div>
        <AddNewForm label="Add waypoint" action={async () => {
          'use server';
          const res = await createWaypoint();
          if (res.ok && res.id) redirect(`/waypoints/${res.id}`);
        }} />
      </div>

      {/* Category summary chips */}
      <div className="flex flex-wrap gap-2">
        {byCategory.map(({ category, count }) => {
          const s = CAT_COLORS[category] ?? { bg: '#e8e2d7', color: '#424844' };
          return (
            <span key={category} className="px-3 py-1.5 rounded-full font-bold capitalize flex items-center gap-1.5"
              style={{ backgroundColor: s.bg, color: s.color, fontSize: '12px' }}>
              {category}
              <span className="font-mono px-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{count.toLocaleString()}</span>
            </span>
          );
        })}
      </div>

      {/* Filter bar (client) */}
      <WaypointsFilterBar
        categories={byCategory.map(c => c.category)}
        districts={districts}
        initial={{
          category: filter.category ?? 'all',
          district: filter.district ?? 'all',
          status: filter.contentStatus,
          q: filter.search ?? '',
        }}
      />

      <Card className="border-[#c2c8c2] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: '#ede8dd' }}>
              <tr className="border-b border-[#c2c8c2]">
                {['#', 'Name', 'Type', 'Category', 'District / Gewog', 'Elev.', 'Facilities', 'Routes', 'In app', 'Visible', 'Workflow'].map(h => (
                  <th key={h} className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d7]">
              {rows.map(w => {
                const cc = CAT_COLORS[w.wp_category] ?? { bg: '#e8e2d7', color: '#424844' };
                const cs = CONTENT_STATUS[w.content_status] ?? CONTENT_STATUS.draft;
                return (
                  <tr key={w.id} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[#727973]" style={{ fontSize: '11px' }}>{w.id}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/waypoints/${w.id}`} className="font-semibold text-[#1d1c15] hover:text-on-primary-fixed-variant block" style={{ fontSize: '13px' }}>{w.name || `Waypoint ${w.id}`}</Link>
                      {w.name_dz && <div className="text-[#727973]" style={{ fontSize: '11px' }}>{w.name_dz}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[#424844]" style={{ fontSize: '12px' }}>{w.wp_type_label || w.wp_type || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-bold capitalize" style={{ backgroundColor: cc.bg, color: cc.color, fontSize: '10px' }}>{w.wp_category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#424844]" style={{ fontSize: '12px' }}>
                      {w.district || '—'}
                      {w.gewog && <span className="text-[#727973]"> · {w.gewog}</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#424844]" style={{ fontSize: '12px' }}>
                      {w.elevation_m != null ? `${w.elevation_m.toLocaleString()} m` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[#424844]" style={{ fontSize: '11px', maxWidth: 180 }}>
                      <div className="truncate" title={w.facilities ?? ''}>
                        {w.facilities ?? <span className="text-[#c2c8c2]">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#424844]" style={{ fontSize: '12px' }}>
                      {w.route_count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          {w.route_count}
                          {w.trek_route_id && (
                            <Link href={`/routes/${w.trek_route_id}`}
                              className="text-[#304d3e] hover:underline" style={{ fontSize: '10px' }}>↗</Link>
                          )}
                        </span>
                      ) : <span className="text-[#c2c8c2]">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Flag on={!!w.show_in_app} hint="From waypoint type registry (canonical)" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Flag on={!!w.is_visible} hint="Editor-controlled per waypoint" />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>No waypoints match these filters</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-[#e8e2d7] flex items-center justify-between" style={{ backgroundColor: '#f9f3e8' }}>
          <p className="text-[#727973]" style={{ fontSize: '13px' }}>
            {total === 0 ? 'No results' : `${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-1">
            <PageLink href={page > 1 ? withPage(page - 1) : null}>← Prev</PageLink>
            <span className="text-[#727973] px-2" style={{ fontSize: '12px' }}>Page {page} of {totalPages}</span>
            <PageLink href={page < totalPages ? withPage(page + 1) : null}>Next →</PageLink>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="px-3 py-1 rounded text-[#c2c8c2]" style={{ fontSize: '12px' }}>{children}</span>
    );
  }
  return (
    <Link href={href}
      className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]"
      style={{ fontSize: '12px', fontWeight: 600 }}>
      {children}
    </Link>
  );
}

function Flag({ on, hint }: { on: boolean; hint: string }) {
  return (
    <span title={hint}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full font-bold"
      style={{
        backgroundColor: on ? '#c9ead6' : '#f3ede2',
        color: on ? '#032014' : '#c2c8c2',
        fontSize: '11px',
      }}>
      {on ? '✓' : '–'}
    </span>
  );
}
