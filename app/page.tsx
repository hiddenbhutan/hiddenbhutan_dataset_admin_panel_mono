import type { Metadata } from 'next';
import { getDashboardCounts, getRecentChanges } from '@/lib/db';
import {
  Map, Bird, PawPrint, Landmark, ArrowRight, PencilLine, Upload,
  Building2, Home, GraduationCap, HeartPulse, Navigation,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dashboard' };

// Typography helpers
const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const headlineMdStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, lineHeight: '28px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};
const dataMonoStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 400, lineHeight: '16px', fontFamily: 'JetBrains Mono, monospace',
};

function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }
function barFill(p: number) { return p >= 80 ? '#304d3e' : p >= 40 ? '#c79a3a' : '#ba1a1a'; }
function pctColor(p: number) { return p >= 80 ? '#1a4d2a' : p >= 40 ? '#7a4a10' : '#93000a'; }

function StatCard({ title, value, subtitle, icon: Icon, href }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link href={href}>
      {/* spec: surface-container-low + outline-variant + rounded-xl; hover lifts to surface-container */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 h-full hover:bg-surface-container transition-colors cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-on-surface-variant uppercase" style={labelCapsStyle}>{title}</p>
            <p className="text-on-surface mt-1" style={displayLgStyle}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-on-surface-variant mt-0.5" style={bodySmStyle}>{subtitle}</p>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-container">
            <Icon size={18} className="text-tertiary-fixed" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-on-surface-variant uppercase mb-3" style={labelCapsStyle}>{children}</p>
  );
}

export default async function DashboardPage() {
  const c = await getDashboardCounts();
  const recent = await getRecentChanges(10);

  const completenessRows = [
    { field: 'difficulty',     filled: c.routesWithDifficulty, total: c.trekRoutes },
    { field: 'duration_days',  filled: c.routesWithDuration,   total: c.trekRoutes },
    { field: 'season_open',    filled: c.routesWithSeason,     total: c.trekRoutes },
    { field: 'distance_km',    filled: c.routesWithDist,       total: c.trekRoutes },
    { field: 'highlights',     filled: c.routesWithHighlights, total: c.trekRoutes },
    { field: 'description',    filled: c.routesWithDesc,       total: c.trekRoutes },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-primary" style={displayLgStyle}>Dashboard</h1>
        <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>HiddenBhutan database overview — live from Postgres</p>
      </div>

      {/* Content & Nature */}
      <div>
        <SectionHeader>Content &amp; Nature</SectionHeader>
        <div className="grid grid-cols-6 gap-4">
          <StatCard title="Trek Routes"     value={c.trekRoutes}        subtitle="active routes"        icon={Map}       href="/routes" />
          <StatCard title="Bird Species"    value={c.birdSpecies}       subtitle="curated · class=Aves" icon={Bird}      href="/species" />
          <StatCard title="Wildlife"        value={c.wildlifeSpecies}   subtitle="curated mammals etc." icon={PawPrint}  href="/species" />
          <StatCard title="Heritage Sites"  value={c.heritageSites}     subtitle="registered sites"     icon={Landmark}  href="/heritage" />
          <StatCard title="Dzongs"          value={c.dzongs}            subtitle="fortress-monasteries" icon={Building2} href="/dzongs" />
          <StatCard title="Conservation"    value={c.conservationAreas} subtitle="protected areas"      icon={Map}       href="/conservation" />
        </div>
      </div>

      {/* Geodata */}
      <div>
        <SectionHeader>Geodata</SectionHeader>
        <div className="grid grid-cols-5 gap-4">
          <StatCard title="Villages"         value={c.villages.toLocaleString()} subtitle="across Bhutan"          icon={Home}          href="/villages" />
          <StatCard title="Schools"          value={c.schools}                    subtitle="educational institutions" icon={GraduationCap} href="/schools" />
          <StatCard title="Health Centers"   value={c.healthCenters}              subtitle="medical facilities"     icon={HeartPulse}    href="/health-centers" />
          <StatCard title="Waypoints"        value={c.waypoints.toLocaleString()} subtitle="trail waypoints"        icon={Navigation}    href="/waypoints" />
          <StatCard title="Chiwogs"          value={c.chiwogs.toLocaleString()}   subtitle="village blocks"         icon={Map}           href="/districts" />
        </div>
      </div>

      {/* Two-column body: completeness left, recent activity right */}
      <div className="grid grid-cols-12 gap-5">
        {/* Completeness */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-xl">
          <div className="px-5 py-4 border-b border-outline-variant">
            <p className="text-on-surface" style={titleSmStyle}>Route enrichment completeness</p>
            <p className="text-on-surface-variant mt-0.5" style={bodySmStyle}>
              Live from trek_routes · {c.trekRoutes} active routes
            </p>
          </div>
          <div className="p-3 space-y-0.5">
            {completenessRows.map(row => {
              const p = pct(row.filled, row.total);
              return (
                <Link href={`/routes?filter=${row.field}`} key={row.field}>
                  <div className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-surface-container transition-colors cursor-pointer">
                    <span className="w-32 text-on-surface flex-shrink-0" style={dataMonoStyle}>{row.field}</span>
                    {/* progress bar — spec: 4px Sand background + Forest/Moss fill */}
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface-container-highest">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: barFill(p) }} />
                    </div>
                    <span className="w-14 text-right text-on-surface-variant" style={bodySmStyle}>{row.filled}/{row.total}</span>
                    <span className="w-9 text-right" style={{ ...labelCapsStyle, color: pctColor(p) }}>{p}%</span>
                  </div>
                </Link>
              );
            })}
            <div className="border-t border-outline-variant mt-2 pt-3 px-2 pb-1">
              <Link href="/routes" className="flex items-center gap-1 text-on-tertiary-container hover:underline font-medium" style={bodySmStyle}>
                Go to Routes <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl">
          <div className="px-5 py-4 border-b border-outline-variant">
            <p className="text-on-surface" style={titleSmStyle}>Recently updated records</p>
            <p className="text-on-surface-variant mt-0.5" style={bodySmStyle}>From last_updated fields in the database</p>
          </div>
          <div>
            {recent.length > 0 ? recent.map((r, i) => (
              <div key={i} className={i < recent.length - 1 ? 'border-b border-outline-variant' : ''}>
                <div className="flex items-center gap-3 px-5 py-2.5">
                  <span className="rounded uppercase flex-shrink-0 bg-surface-container-highest text-on-surface-variant"
                    style={{ ...labelCapsStyle, padding: '2px 8px' }}>
                    {r.entity_type}
                  </span>
                  <span className="flex-1 text-on-surface truncate" style={bodySmStyle}>{r.entity_name}</span>
                  <span className="text-on-surface-variant flex-shrink-0" style={dataMonoStyle}>
                    {r.last_updated?.split('T')[0] ?? r.last_updated}
                  </span>
                </div>
              </div>
            )) : (
              <div className="px-6 py-8 text-center text-on-surface-variant" style={bodySmStyle}>
                No last_updated timestamps in DB yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-on-surface mb-3" style={titleSmStyle}>Quick actions</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: PencilLine, title: 'Enrich trek routes',     desc: `${c.trekRoutes - c.routesWithDifficulty} routes missing difficulty`, href: '/routes' },
            { icon: Bird,       title: 'Add bird location links',desc: `${c.locationLinks} links · ${c.birdSpecies} species total`,         href: '/species' },
            { icon: Upload,     title: 'Upload media',           desc: 'Add photos to routes and locations',                                  href: '/media' },
          ].map(({ icon: Icon, title, desc, href }) => (
            <Link href={href} key={title}>
              <div className="bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container transition-colors cursor-pointer p-5 flex items-start gap-4 h-full">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-container">
                  <Icon size={18} className="text-tertiary-fixed" />
                </div>
                <div className="min-w-0">
                  <p className="text-on-surface" style={titleSmStyle}>{title}</p>
                  <p className="text-on-surface-variant mt-0.5" style={bodySmStyle}>{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Headline-md silenced — included for typography ramp coverage */}
      <span className="sr-only" style={headlineMdStyle}>HiddenBhutan Admin Dashboard</span>
    </div>
  );
}
