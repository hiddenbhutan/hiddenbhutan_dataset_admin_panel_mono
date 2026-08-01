import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getMediaItems,
  getMediaCount,
  getMediaStatusCounts,
  getMediaEntityTypeCounts,
} from '@/lib/db';
import type { MediaEntityType, MediaKind, MediaLicense } from '@/lib/db';
import { Card } from '@/components/ui/card';
import MediaFilterBar from './MediaFilterBar';
import MediaCard from '@/components/media/MediaCard';
import MediaUploadForm from '@/components/media/MediaUploadForm';

export const metadata: Metadata = { title: 'Media Library' };

const PAGE_SIZE = 60;

const ENTITY_LABEL: Record<MediaEntityType, string> = {
  locality:            'Locality',
  trek_route:          'Route',
  waypoint:            'Waypoint',
  heritage_site:       'Heritage',
  dzong:               'Dzong',
  dzong_lhakhang:      'Lhakhang',
  health_center:       'Health',
  school:              'School',
  conservation_area:   'Conservation',
  biological_corridor: 'Corridor',
  festival:            'Festival',
  thangka:             'Thangka',
  cuisine_item:        'Food',
  cuisine_ingredient:  'Ingredient',
  species:             'Species',
  species_occurrence:  'Sighting',
  historical_figure:   'Figure',
  zorig_chusum:        'Zorig',
  national_symbol:     'Symbol',
  cultural_custom:     'Custom',
  traditional_game:    'Game',
};

const ENTITY_HREF: Partial<Record<MediaEntityType, string>> = {
  trek_route:        '/routes',
  waypoint:          '/waypoints',
  heritage_site:     '/heritage',
  dzong:             '/dzongs',
  health_center:     '/health-centers',
  conservation_area: '/conservation',
  biological_corridor: '/corridors',
  festival:          '/festivals',
  species:           '/species',
  cuisine_item:      '/food',
  zorig_chusum:      '/zorig-chusum',
  national_symbol:   '/national-symbols',
  cultural_custom:   '/cultural-customs',
  traditional_game:  '/traditional-games',
  historical_figure: '/historical-figures',
  thangka:           '/thangkas',
  cuisine_ingredient:'/cuisine-ingredients',
};

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

type SearchParams = Promise<{
  page?: string;
  entity?: MediaEntityType;
  kind?: MediaKind;
  license?: MediaLicense;
  status?: string;
  primary?: string;
  q?: string;
}>;

export default async function MediaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const filter = {
    entityType: sp.entity as MediaEntityType | undefined,
    kind: sp.kind as MediaKind | undefined,
    license: sp.license as MediaLicense | undefined,
    contentStatus: (sp.status && sp.status !== 'all'
      ? sp.status
      : 'all') as 'draft' | 'in_review' | 'published' | 'archived' | 'all',
    primaryOnly: sp.primary === '1',
    search: sp.q || undefined,
  };

  const [items, total, statusCounts, entityCounts] = await Promise.all([
    getMediaItems(filter, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getMediaCount(filter),
    getMediaStatusCounts(),
    getMediaEntityTypeCounts(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  function withPage(p: number) {
    const params = new URLSearchParams();
    if (filter.entityType) params.set('entity', filter.entityType);
    if (filter.kind) params.set('kind', filter.kind);
    if (filter.license) params.set('license', filter.license);
    if (filter.contentStatus !== 'all') params.set('status', filter.contentStatus);
    if (filter.primaryOnly) params.set('primary', '1');
    if (filter.search) params.set('q', filter.search);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/media?${qs}` : '/media';
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-bold text-[#1d1c15]" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>Media Library</h1>
          <p className="text-[#424844] mt-1" style={{ fontSize: '14px' }}>
            {statusCounts.total.toLocaleString()} assets · {formatBytes(statusCounts.total_bytes)} · {statusCounts.published.toLocaleString()} published · {statusCounts.primary.toLocaleString()} primary · {statusCounts.with_cdn.toLocaleString()} CDN-published
          </p>
        </div>
      </div>

      <MediaUploadForm revalidatePaths={['/media']} />

      <MediaFilterBar
        entityCounts={entityCounts}
        initial={{
          entity:   filter.entityType   ?? 'all',
          kind:     filter.kind         ?? 'all',
          license:  filter.license      ?? 'all',
          status:   filter.contentStatus,
          primary:  filter.primaryOnly,
          q:        filter.search ?? '',
        }}
      />

      {items.length === 0 ? (
        <Card className="border-[#c2c8c2] bg-white p-8 text-center text-[#727973]" style={{ fontSize: '14px' }}>
          No media match these filters.
        </Card>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {items.map(item => {
            const entityHrefBase = ENTITY_HREF[item.entity_type];
            return (
              <MediaCard
                key={item.id}
                item={item}
                revalidatePaths={['/media']}
                entityHref={entityHrefBase ? `${entityHrefBase}/${item.entity_id}` : undefined}
                showEntityLabel={ENTITY_LABEL[item.entity_type]}
              />
            );
          })}
        </div>
      )}

      <Card className="border-[#c2c8c2] bg-[#f9f3e8]">
        <div className="px-5 py-3 flex items-center justify-between">
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
