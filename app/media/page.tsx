import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getMediaItems,
  getMediaCount,
  getMediaStatusCounts,
  getMediaEntityTypeCounts,
} from '@/lib/db';
import type {
  MediaEntityType,
  MediaKind,
  MediaLicense,
} from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import MediaFilterBar from './MediaFilterBar';
import MediaThumb from './MediaThumb';

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

const KIND_LABEL: Record<MediaKind, string> = {
  image:        'Image',
  video:        'Video',
  audio:        'Audio',
  panorama_360: '360°',
  model_3d:     '3D',
};

const LICENSE_LABEL: Record<MediaLicense, { label: string; bg: string; color: string }> = {
  all_rights_reserved:  { label: 'All rights',   bg: '#ffdad6', color: '#93000a' },
  cc0:                  { label: 'CC0',          bg: '#c9ead6', color: '#1a4d2a' },
  cc_by:                { label: 'CC BY',        bg: '#c9ead6', color: '#1a4d2a' },
  cc_by_sa:             { label: 'CC BY-SA',     bg: '#c9ead6', color: '#1a4d2a' },
  cc_by_nc:             { label: 'CC BY-NC',     bg: '#fdefd8', color: '#7a4a10' },
  cc_by_nc_sa:          { label: 'CC BY-NC-SA',  bg: '#fdefd8', color: '#7a4a10' },
  public_domain:        { label: 'Public domain', bg: '#dae69f', color: '#5d682e' },
  used_with_permission: { label: 'With permission', bg: '#d6e8f0', color: '#2c5a70' },
};

const CONTENT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: '#e8e2d7', color: '#424844' },
  in_review: { label: 'In review', bg: '#fdefd8', color: '#7a4a10' },
  published: { label: 'Published', bg: '#c9ead6', color: '#1a4d2a' },
  archived:  { label: 'Archived',  bg: '#e8d6d6', color: '#7a1a1a' },
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

      {/* Upload zone — backend not yet wired */}
      <div
        className="border-2 border-dashed rounded-xl p-6 text-center"
        style={{ borderColor: '#c2c8c2', backgroundColor: '#f9f3e8', opacity: 0.7 }}
      >
        <Upload size={24} className="mx-auto mb-2 text-[#424844]" />
        <p className="font-semibold text-[#1d1c15]" style={{ fontSize: '13px' }}>Upload pipeline pending</p>
        <p className="text-[#727973] mt-1" style={{ fontSize: '11px' }}>
          Writes to <code>content.media</code> need an S3/CDN integration. Insert rows via loader scripts for now.
        </p>
      </div>

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
            const lic = LICENSE_LABEL[item.license];
            const cs = CONTENT_STATUS[item.content_status] ?? CONTENT_STATUS.draft;
            const entityHref = ENTITY_HREF[item.entity_type];
            return (
              <div key={item.id}
                className="group relative rounded-lg overflow-hidden border border-[#c2c8c2]"
                style={{ aspectRatio: '4/3', backgroundColor: '#f3ede2' }}>
                <MediaThumb item={item} />

                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
                  {item.is_primary ? (
                    <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#ffdea3', color: '#261900', fontSize: '9px' }}>
                      Hero
                    </span>
                  ) : null}
                  {item.kind !== 'image' && (
                    <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#082619', color: '#ffdea3', fontSize: '9px' }}>
                      {KIND_LABEL[item.kind]}
                    </span>
                  )}
                </div>

                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
                  <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: cs.bg, color: cs.color, fontSize: '9px' }}>
                    {cs.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded font-bold uppercase" title={lic.label} style={{ backgroundColor: lic.bg, color: lic.color, fontSize: '9px' }}>
                    {lic.label}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex flex-col gap-0.5"
                  style={{ backgroundColor: 'rgba(8,38,25,0.85)' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#304d3e', color: '#ffdea3', fontSize: '8px' }}>
                      {ENTITY_LABEL[item.entity_type]}
                    </span>
                    {entityHref ? (
                      <Link href={`${entityHref}/${item.entity_id}`} className="text-[#ffdea3] hover:underline truncate"
                        style={{ fontSize: '10px' }}>
                        {item.entity_name ?? `#${item.entity_id}`}
                      </Link>
                    ) : (
                      <span className="text-[#708f7d] truncate" style={{ fontSize: '10px' }}>
                        {item.entity_name ?? `#${item.entity_id}`}
                      </span>
                    )}
                  </div>
                  {item.alt_text && (
                    <p className="text-[#ffdea3] truncate" style={{ fontSize: '10px' }} title={item.alt_text}>
                      {item.alt_text}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[#708f7d]" style={{ fontSize: '9px' }}>
                    <span className="font-mono truncate">
                      {item.width_px && item.height_px ? `${item.width_px}×${item.height_px}` : ''}
                      {item.duration_s ? ` ${item.duration_s.toFixed(0)}s` : ''}
                    </span>
                    {item.byte_size != null && (
                      <span className="font-mono">{formatBytes(item.byte_size)}</span>
                    )}
                  </div>
                  {item.photographer && (
                    <p className="text-[#708f7d] truncate italic" style={{ fontSize: '9px' }}>
                      © {item.photographer}
                    </p>
                  )}
                </div>
              </div>
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
