import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDzongs, getDzongStatusCounts, getDistrictList } from '@/lib/db';
import { createDzong } from '@/lib/actions/dzongs';
import DzongsBrowser from './DzongsBrowser';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';

export const metadata: Metadata = { title: 'Dzongs' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function DzongsPage() {
  const [dzongs, counts, districts] = await Promise.all([
    getDzongs(),
    getDzongStatusCounts(),
    getDistrictList(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Dzongs</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.total} fortress-monasteries · {counts.admin_seat} active admin seats · {counts.with_monk_body} house a monk body · {counts.published} published / {counts.draft} draft
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add Dzong" action={async () => {
            'use server';
            const res = await createDzong();
            if (res.ok && res.id) redirect(`/dzongs/${res.id}`);
          }} />
        </div>
      </div>
      <DzongsBrowser dzongs={dzongs} statusCounts={counts} districts={districts} />
    </div>
  );
}
