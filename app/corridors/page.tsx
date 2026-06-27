import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getConservationAreaList,
  getConservationStatusCounts,
  getCorridorLinksFor,
} from '@/lib/db';
import { createConservationArea } from '@/lib/actions/conservation-areas';
import { Card } from '@/components/ui/card';
import { TreePine, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import CorridorsBrowser from './CorridorsBrowser';

export const metadata: Metadata = { title: 'Biological Corridors' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function CorridorsPage() {
  const [corridors, counts] = await Promise.all([
    getConservationAreaList({ paType: 'biological_corridor' }),
    getConservationStatusCounts({ paType: 'biological_corridor' }),
  ]);

  const corridorWithLinks = await Promise.all(
    corridors.map(async c => ({
      corridor: c,
      links: await getCorridorLinksFor(c.id),
    })),
  );

  const connectedPaCount = new Set(corridorWithLinks.flatMap(c => c.links.map(l => l.pa_id))).size;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Biological Corridors</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.total} corridors · {counts.published} published · {counts.draft} draft · linking {connectedPaCount} protected areas
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add Corridor" action={async () => {
            'use server';
            const res = await createConservationArea('biological_corridor');
            if (res.ok && res.id) redirect(`/corridors/${res.id}`);
          }} />
        </div>
      </div>

      <Card className="border border-outline-variant bg-primary-container rounded-xl shadow-none overflow-hidden">
        <div className="h-28 flex items-center justify-center">
          <div className="text-center">
            <TreePine size={26} className="mx-auto mb-1 text-primary-fixed" />
            <p className="text-tertiary-fixed" style={{ fontSize: '13px', fontWeight: 600 }}>Biological Corridor Network</p>
            <p className="mt-0.5 text-on-primary-container" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
              Mapbox polygon layer — coming with backend integration
            </p>
          </div>
        </div>
      </Card>

      <CorridorsBrowser corridors={corridorWithLinks} statusCounts={counts} />
    </div>
  );
}
