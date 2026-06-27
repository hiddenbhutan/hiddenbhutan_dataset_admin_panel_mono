import type { Metadata } from 'next';
import { getPOIs, getPOICategoryCounts } from '@/lib/db';
import POIBrowserClient from './POIBrowserClient';

export const metadata: Metadata = { title: 'POI Browser' };

export default async function POIPage() {
  // Load a sample for client-side search; the full count comes from the
  // category aggregate so users see the real total even when only a slice is
  // loaded.
  const [pois, counts] = await Promise.all([
    getPOIs({ limit: 1500 }),
    getPOICategoryCounts(),
  ]);

  return <POIBrowserClient pois={pois} counts={counts} />;
}
