import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getHeritageSites,
  getHeritageSiteTypes,
  getHeritageStatusCounts,
  getDistrictList,
} from '@/lib/db';
import { createHeritageSite } from '@/lib/actions/heritage-sites';
import HeritageClient from './HeritageClient';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';

export const metadata: Metadata = { title: 'Heritage Sites' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function HeritagePage() {
  const [sites, types, statusCounts, districts] = await Promise.all([
    getHeritageSites(500),
    getHeritageSiteTypes(),
    getHeritageStatusCounts(),
    getDistrictList(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Heritage Sites</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {statusCounts.total} total · {statusCounts.published} published · {statusCounts.in_review} in review · {statusCounts.draft} draft · {statusCounts.archived} archived
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add site" action={async () => {
            'use server';
            const res = await createHeritageSite();
            if (res.ok && res.id) redirect(`/heritage/${res.id}`);
          }} />
        </div>
      </div>

      <HeritageClient sites={sites} types={types} statusCounts={statusCounts} districts={districts} />
    </div>
  );
}
