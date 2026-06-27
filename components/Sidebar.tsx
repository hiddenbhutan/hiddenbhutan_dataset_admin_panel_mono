'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ScrollText, Map, Navigation, MapPin,
  Bird, TreePine, GitBranch,
  Landmark, Building2, UserCircle2, Sparkles,
  CalendarDays, UtensilsCrossed, Wheat, Hammer, Crown, AlertTriangle, Swords,
  Home, HeartPulse, GraduationCap, Database,
  Image,
  Tag,
  Users, Settings,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/',      label: 'Dashboard', icon: LayoutDashboard },
      { href: '/audit', label: 'Activity',  icon: ScrollText },
    ],
  },
  {
    label: 'Trails & Geography',
    items: [
      { href: '/routes',     label: 'Trek Routes',       icon: Map },
      { href: '/waypoints',  label: 'Waypoints',         icon: Navigation },
      { href: '/poi',        label: 'POI Browser',       icon: MapPin },
    ],
  },
  {
    label: 'Nature',
    items: [
      { href: '/species',      label: 'Species',          icon: Bird },
      { href: '/conservation', label: 'Conservation Areas', icon: TreePine },
      { href: '/corridors',    label: 'Bio. Corridors',   icon: GitBranch },
    ],
  },
  {
    label: 'Heritage',
    items: [
      { href: '/heritage',           label: 'Heritage Sites',     icon: Landmark },
      { href: '/dzongs',             label: 'Dzongs',             icon: Building2 },
      { href: '/historical-figures', label: 'Historical Figures', icon: UserCircle2 },
      { href: '/thangkas',           label: 'Thangkas',           icon: Sparkles },
    ],
  },
  {
    label: 'Culture',
    items: [
      { href: '/festivals',           label: 'Festivals',         icon: CalendarDays },
      { href: '/food',                label: 'Cuisine',           icon: UtensilsCrossed },
      { href: '/cuisine-ingredients', label: 'Ingredients',       icon: Wheat },
      { href: '/zorig-chusum',        label: 'Zorig Chusum',      icon: Hammer },
      { href: '/national-symbols',    label: 'National Symbols',  icon: Crown },
      { href: '/cultural-customs',    label: 'Cultural Customs',  icon: AlertTriangle },
      { href: '/traditional-games',   label: 'Traditional Games', icon: Swords },
    ],
  },
  {
    label: 'Settlement',
    items: [
      { href: '/villages',       label: 'Villages',        icon: Home },
      { href: '/health-centers', label: 'Health Centers',  icon: HeartPulse },
      { href: '/schools',        label: 'Schools',         icon: GraduationCap },
      { href: '/districts',      label: 'Administrative',  icon: Database },
    ],
  },
  {
    label: 'Media',
    items: [
      { href: '/media', label: 'Media Library', icon: Image },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/reference', label: 'Reference Editors', icon: Tag },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/users',    label: 'Users',    icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 pt-5 pb-2 uppercase text-on-primary-container/60"
      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px' }}>
      {children}
    </p>
  );
}

function NavLink({
  href, label, icon: Icon, pathname,
}: { href: string; label: string; icon: React.ElementType; pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-6 py-2.5 ${active ? 'nav-active' : 'nav-inactive'}`}
      style={{ textDecoration: 'none' }}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: '20px' }}>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col z-50 border-r border-outline-variant bg-primary-container">
      <div className="px-6 py-6 flex-shrink-0">
        <h1 className="text-tertiary-fixed leading-tight tracking-tight"
          style={{ fontSize: '24px', fontWeight: 700, lineHeight: '32px', letterSpacing: '-0.02em' }}>
          HiddenBhutan
        </h1>
        <p className="text-on-primary-container mt-1 uppercase"
          style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px' }}>
          Admin Panel
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto sidebar-scroll pb-4">
        {NAV.map(section => (
          <div key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            {section.items.map(item => (
              <NavLink key={item.href} pathname={pathname} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 px-6 py-3 border-t border-on-primary-fixed-variant/40">
        <p className="text-on-primary-container/50"
          style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
          v0.2.0
        </p>
      </div>
    </aside>
  );
}
