import type { Metadata } from 'next';
import Link from 'next/link';
import { getRefTableSummaries } from '@/lib/db';
import { MapPin, Landmark, Clock, Sparkles, Utensils, Stethoscope, Hospital, ShieldAlert, Binoculars, GraduationCap, Map as MapIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Reference Editors' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

interface RefEntry {
  key: string;
  path: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  feedsInto: string;
}

const ENTRIES: RefEntry[] = [
  {
    key: 'waypoint_type',
    path: '/reference/waypoint-type',
    title: 'Waypoint Types',
    description: 'Drives waypoint icons, grouping, and zoom-based visibility on the trail map.',
    icon: MapPin,
    feedsInto: 'Waypoints',
  },
  {
    key: 'heritage_type',
    path: '/reference/heritage-type',
    title: 'Heritage Types',
    description: 'Lhakhang, goemba, chorten, nye, hermitage, ruins — categorizes heritage sites + drives icons.',
    icon: Landmark,
    feedsInto: 'Heritage Sites',
  },
  {
    key: 'historical_period',
    path: '/reference/historical-period',
    title: 'Historical Periods',
    description: 'Guru era, Drukpa lineage, Zhabdrung, Wangchuck dynasty — used to slot figures and sites into a timeline.',
    icon: Clock,
    feedsInto: 'Historical Figures + Heritage',
  },
  {
    key: 'festival_type',
    path: '/reference/festival-type',
    title: 'Festival Types',
    description: 'Tshechu, drupchen, mewang, mani rimdu, losar, harvest, secular — categorizes festivals.',
    icon: Sparkles,
    feedsInto: 'Festivals',
  },
  {
    key: 'cuisine_category',
    path: '/reference/cuisine-category',
    title: 'Cuisine Categories',
    description: 'Main, side, snack, beverage, alcohol, dessert, condiment — used to group dishes + drinks.',
    icon: Utensils,
    feedsInto: 'Cuisine (Food)',
  },
  {
    key: 'health_service',
    path: '/reference/health-service',
    title: 'Health Services',
    description: 'Emergency, maternity, dental, x-ray, ambulance, helipad — drives health center service badges.',
    icon: Stethoscope,
    feedsInto: 'Health Centers',
  },
  {
    key: 'health_center_type',
    path: '/reference/health-center-type',
    title: 'Health Center Types',
    description: 'ORC, BHU I/II, PHC, district / regional / national referral hospital — facility tiers with full form + description.',
    icon: Hospital,
    feedsInto: 'Health Centers',
  },
  {
    key: 'conservation_status',
    path: '/reference/conservation-status',
    title: 'Conservation Status',
    description: 'IUCN Red List categories (EX, EW, CR, EN, VU, NT, LC, DD, NE) with full form + definition — global & Bhutan species assessments.',
    icon: ShieldAlert,
    feedsInto: 'Species',
  },
  {
    key: 'observation_category',
    path: '/reference/observation-category',
    title: 'Sighting Categories',
    description: 'Biodiversity Portal, expert survey, GBIF, eBird, iNaturalist — where/how a species sighting was recorded.',
    icon: Binoculars,
    feedsInto: 'Species sightings',
  },
  {
    key: 'school_category',
    path: '/reference/school-category',
    title: 'School Categories',
    description: 'Community primary, primary, lower / middle / higher secondary, autonomous, private, monastic, institute — school classification.',
    icon: GraduationCap,
    feedsInto: 'Schools',
  },
  {
    key: 'dzongkhag',
    path: '/reference/dzongkhag',
    title: 'Dzongkhags',
    description: 'Bhutan’s 20 dzongkhags (districts). Top of the admin hierarchy; referenced by nearly every geospatial entity.',
    icon: MapIcon,
    feedsInto: 'Villages, Schools, Health Centers, Heritage…',
  },
];

export default async function ReferenceHubPage() {
  const summaries = await getRefTableSummaries();
  const summaryByKey = new Map(summaries.map(s => [s.key, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-primary" style={displayLgStyle}>Reference Editors</h1>
        <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
          Edit the small lookup tables that feed dropdowns and badges across the app.
          Changes propagate to every record that references them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ENTRIES.map(entry => {
          const summary = summaryByKey.get(entry.key);
          const Icon = entry.icon;
          return (
            <Link key={entry.key} href={entry.path} className="block group">
              <div className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none hover:bg-surface-container transition-colors p-5 h-full">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-tertiary-fixed text-on-tertiary-fixed p-3 flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-on-surface font-bold" style={titleSmStyle}>{entry.title}</p>
                      <span className="font-mono text-outline" style={{ fontSize: '11px' }}>ref.{entry.key}</span>
                    </div>
                    <p className="text-on-surface-variant mb-3" style={bodySmStyle}>{entry.description}</p>
                    <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-outline-variant">
                      <div>
                        <p className="text-outline uppercase" style={labelCapsStyle}>Rows</p>
                        <p className="font-bold text-on-surface" style={{ fontSize: '18px' }}>{summary?.total ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-outline uppercase" style={labelCapsStyle}>In use</p>
                        <p className="font-bold text-on-surface" style={{ fontSize: '18px' }}>{summary?.in_use ?? '—'}</p>
                      </div>
                      <div className="ml-auto">
                        <p className="text-outline uppercase" style={labelCapsStyle}>Feeds</p>
                        <p className="text-on-primary-fixed-variant font-semibold" style={{ fontSize: '12px' }}>{entry.feedsInto}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
