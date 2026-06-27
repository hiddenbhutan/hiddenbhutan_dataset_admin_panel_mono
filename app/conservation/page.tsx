import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getConservationAreaList,
  getConservationStatusCounts,
} from '@/lib/db';
import { createConservationArea } from '@/lib/actions/conservation-areas';
import ConservationBrowser from './ConservationBrowser';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';

export const metadata: Metadata = { title: 'Conservation Areas' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function ConservationPage() {
  const [areas, counts] = await Promise.all([
    getConservationAreaList({ excludePaType: 'biological_corridor' }),
    getConservationStatusCounts({ excludePaType: 'biological_corridor' }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Conservation Areas</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.pa_total} protected areas · {counts.published} published · {counts.draft} draft · {counts.active} active · {counts.permit_required} permit-required
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add Area" action={async () => {
            'use server';
            const res = await createConservationArea('national_park');
            if (res.ok && res.id) redirect(`/conservation/${res.id}`);
          }} />
        </div>
      </div>
      <ConservationBrowser areas={areas} statusCounts={counts} />
    </div>
  );
}
