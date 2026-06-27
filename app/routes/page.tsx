import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTrekRoutes, getTrekRouteStatusCounts } from '@/lib/db';
import { createTrekRoute } from '@/lib/actions/trek-routes';
import RoutesTable from '@/components/tables/RoutesTable';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';

export const metadata: Metadata = { title: 'Trek Routes' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function RoutesPage() {
  const routes = await getTrekRoutes(500);
  const counts = await getTrekRouteStatusCounts();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Trek Routes</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.total} total · {counts.published} published · {counts.in_review} in review · {counts.draft} draft · {counts.archived} archived
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add Route" action={async () => {
            'use server';
            const res = await createTrekRoute();
            if (res.ok && res.id) redirect(`/routes/${res.id}`);
          }} />
        </div>
      </div>

      <RoutesTable routes={routes} statusCounts={counts} />
    </div>
  );
}
