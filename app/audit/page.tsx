import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getActivityFeed,
  getActivityEntityTypes,
  getAdminUsers,
} from '@/lib/db';
import { Card } from '@/components/ui/card';
import AuditFilterBar from './AuditFilterBar';

export const metadata: Metadata = { title: 'Audit Log' };

const PAGE_SIZE = 100;

const ENTITY_LABEL: Record<string, string> = {
  trek_route:          'Route',
  waypoint:            'Waypoint',
  heritage_site:       'Heritage',
  dzong:               'Dzong',
  dzong_lhakhang:      'Lhakhang',
  festival:            'Festival',
  thangka:             'Thangka',
  species:             'Species',
  historical_figure:   'Figure',
  conservation_area:   'Conservation',
  health_center:       'Health',
  school:              'School',
  locality:            'Locality',
  cuisine_item:        'Food',
  cuisine_ingredient:  'Ingredient',
  zorig_chusum:        'Zorig',
  national_symbol:     'Symbol',
  cultural_custom:     'Custom',
  traditional_game:    'Game',
  media:               'Media',
};

const ENTITY_HREF: Record<string, string> = {
  trek_route:          '/routes',
  waypoint:            '/waypoints',
  heritage_site:       '/heritage',
  dzong:               '/dzongs',
  festival:            '/festivals',
  species:             '/species',
  conservation_area:   '/conservation',
  health_center:       '/health-centers',
  school:              '/schools',
  cuisine_item:        '/food',
  zorig_chusum:        '/zorig-chusum',
  national_symbol:     '/national-symbols',
  cultural_custom:     '/cultural-customs',
  traditional_game:    '/traditional-games',
  historical_figure:   '/historical-figures',
  thangka:             '/thangkas',
  cuisine_ingredient:  '/cuisine-ingredients',
};

const ACTION_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  created: { bg: '#c9ead6', color: '#1a4d2a', label: 'Created' },
  updated: { bg: '#d6e8f0', color: '#2c5a70', label: 'Updated' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function formatStamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function formatRel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  if (diffMin < 60 * 24 * 30) return `${Math.round(diffMin / 60 / 24)}d ago`;
  return '';
}

type SearchParams = Promise<{
  page?: string;
  entity?: string;
  actor?: string;
  action?: 'created' | 'updated';
  since?: string;
  until?: string;
}>;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const filter = {
    entityType: sp.entity && sp.entity !== 'all' ? sp.entity : undefined,
    actorId: sp.actor && sp.actor !== 'all' ? parseInt(sp.actor, 10) : undefined,
    action: sp.action,
    since: sp.since || undefined,
    until: sp.until || undefined,
  };

  const [entries, entityTypes, users] = await Promise.all([
    getActivityFeed(filter, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE),
    getActivityEntityTypes(),
    getAdminUsers(),
  ]);
  const hasNext = entries.length > PAGE_SIZE;
  const pageEntries = entries.slice(0, PAGE_SIZE);

  function withPage(p: number) {
    const params = new URLSearchParams();
    if (filter.entityType) params.set('entity', filter.entityType);
    if (filter.actorId != null) params.set('actor', String(filter.actorId));
    if (filter.action) params.set('action', filter.action);
    if (filter.since) params.set('since', filter.since);
    if (filter.until) params.set('until', filter.until);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/audit?${qs}` : '/audit';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div>
        <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
          Activity feed
        </h1>
        <p className="text-[#424844] mt-1" style={{ fontSize: '14px' }}>
          Recent creations and updates aggregated across every content table.
        </p>
      </div>

      <div className="rounded p-3 border border-[#c2c8c2]" style={{ backgroundColor: '#fff8e8' }}>
        <p className="text-[#7a4a10]" style={{ fontSize: '12px' }}>
          The schema has no dedicated <code>audit_log</code> table, so field-level diff
          history (old value → new value) isn&apos;t available here. This view is derived
          from <code>updated_at</code> / <code>updated_by</code> on each content table. To
          capture per-field changes, add a trigger-driven audit table in a future migration.
        </p>
      </div>

      <AuditFilterBar
        entityTypes={entityTypes.map(e => ({ value: e, label: ENTITY_LABEL[e] ?? e }))}
        users={users.map(u => ({ id: u.id, label: u.full_name }))}
        initial={{
          entity: filter.entityType ?? 'all',
          actor:  filter.actorId != null ? String(filter.actorId) : 'all',
          action: filter.action ?? 'all',
          since:  filter.since ?? '',
          until:  filter.until ?? '',
        }}
      />

      <Card className="border-[#c2c8c2] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: '#ede8dd' }}>
              <tr className="border-b border-[#c2c8c2]">
                {['Timestamp', 'User', 'Action', 'Entity', 'Workflow'].map(h => (
                  <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider text-[#304d3e]" style={{ fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d7]">
              {pageEntries.map((entry, i) => {
                const ab = ACTION_BADGE[entry.action];
                const cs = entry.content_status ? CONTENT_STATUS[entry.content_status] : null;
                const entityLabel = ENTITY_LABEL[entry.entity_type] ?? entry.entity_type;
                const entityHref = ENTITY_HREF[entry.entity_type];
                return (
                  <tr key={`${entry.entity_type}-${entry.entity_id}-${entry.action}-${i}`} className="hover:bg-[#f3ede2] transition-colors">
                    <td className="px-4 py-3" style={{ fontSize: '12px' }}>
                      <div className="font-mono text-[#1d1c15]">{formatStamp(entry.occurred_at)}</div>
                      <div className="text-[#727973]" style={{ fontSize: '10px' }}>{formatRel(entry.occurred_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.actor_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#f3ede2', color: '#304d3e', fontSize: '10px' }}>
                            {initials(entry.actor_name)}
                          </div>
                          <div>
                            <div className="text-[#1d1c15]" style={{ fontSize: '13px' }}>{entry.actor_name}</div>
                            {entry.actor_email && <div className="text-[#727973]" style={{ fontSize: '10px' }}>{entry.actor_email}</div>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#727973] italic" style={{ fontSize: '12px' }}>System / loader</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: ab.bg, color: ab.color, fontSize: '10px' }}>
                        {ab.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#e8e2d7', color: '#424844', fontSize: '10px' }}>
                          {entityLabel}
                        </span>
                        {entityHref ? (
                          <Link href={`${entityHref}/${entry.entity_id}`} className="text-[#304d3e] font-medium hover:underline" style={{ fontSize: '13px' }}>
                            {entry.entity_name ?? `#${entry.entity_id}`}
                          </Link>
                        ) : (
                          <span className="text-[#424844]" style={{ fontSize: '13px' }}>{entry.entity_name ?? `#${entry.entity_id}`}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cs ? (
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '10px' }}>{cs.label}</span>
                      ) : (
                        <span className="text-[#c2c8c2]" style={{ fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageEntries.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-[#727973]" style={{ fontSize: '14px' }}>No activity matches these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#e8e2d7] flex items-center justify-between" style={{ backgroundColor: '#f9f3e8' }}>
          <p className="text-[#727973]" style={{ fontSize: '13px' }}>
            Page {page} · {pageEntries.length} entries shown
          </p>
          <div className="flex items-center gap-1" style={{ fontSize: '12px' }}>
            {page > 1 ? (
              <Link href={withPage(page - 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>← Newer</Link>
            ) : <span className="px-3 py-1 rounded text-[#c2c8c2]">← Newer</span>}
            {hasNext ? (
              <Link href={withPage(page + 1)} className="px-3 py-1 rounded text-[#304d3e] hover:bg-[#ede8dd]" style={{ fontWeight: 600 }}>Older →</Link>
            ) : <span className="px-3 py-1 rounded text-[#c2c8c2]">Older →</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
