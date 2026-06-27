'use client';

import { usePathname } from 'next/navigation';

/**
 * Derives the top-bar section title from the active pathname.
 */
const SECTION_TITLES: Array<{ test: RegExp; label: string }> = [
  { test: /^\/$/,                       label: 'Dashboard' },
  { test: /^\/audit/,                   label: 'Activity Feed' },

  // Trails & Geography
  { test: /^\/routes/,                  label: 'Trek Routes' },
  { test: /^\/waypoints/,               label: 'Waypoints' },
  { test: /^\/poi/,                     label: 'POI Browser' },

  // Nature
  { test: /^\/species/,                 label: 'Species' },
  { test: /^\/conservation/,            label: 'Conservation Areas' },
  { test: /^\/corridors/,               label: 'Biological Corridors' },

  // Heritage
  { test: /^\/heritage/,                label: 'Heritage Sites' },
  { test: /^\/dzongs/,                  label: 'Dzongs' },
  { test: /^\/historical-figures/,      label: 'Historical Figures' },
  { test: /^\/thangkas/,                label: 'Thangkas' },

  // Culture
  { test: /^\/festivals/,               label: 'Festivals' },
  { test: /^\/food/,                    label: 'Cuisine' },
  { test: /^\/cuisine-ingredients/,     label: 'Cuisine Ingredients' },
  { test: /^\/zorig-chusum/,            label: 'Zorig Chusum' },
  { test: /^\/national-symbols/,        label: 'National Symbols' },
  { test: /^\/cultural-customs/,        label: 'Cultural Customs' },
  { test: /^\/traditional-games/,       label: 'Traditional Games' },

  // Settlement
  { test: /^\/villages/,                label: 'Villages' },
  { test: /^\/health-centers/,          label: 'Health Centers' },
  { test: /^\/schools/,                 label: 'Schools' },
  { test: /^\/districts/,               label: 'Administrative Divisions' },

  // Media
  { test: /^\/media/,                   label: 'Media Library' },

  // Reference editors
  { test: /^\/reference\/waypoint-type/,     label: 'Waypoint Types' },
  { test: /^\/reference\/heritage-type/,     label: 'Heritage Types' },
  { test: /^\/reference\/historical-period/, label: 'Historical Periods' },
  { test: /^\/reference\/festival-type/,     label: 'Festival Types' },
  { test: /^\/reference\/cuisine-category/,  label: 'Cuisine Categories' },
  { test: /^\/reference\/health-service/,    label: 'Health Services' },
  { test: /^\/reference/,                    label: 'Reference Editors' },

  // System
  { test: /^\/users/,                   label: 'Users' },
  { test: /^\/settings/,                label: 'Settings' },
];

export default function TopBarTitle() {
  const pathname = usePathname();
  const match = SECTION_TITLES.find(s => s.test.test(pathname));
  const label = match?.label ?? '';
  return (
    <h2 className="text-primary truncate" style={{ fontSize: '20px', fontWeight: 700, lineHeight: '28px' }}>
      {label}
    </h2>
  );
}
