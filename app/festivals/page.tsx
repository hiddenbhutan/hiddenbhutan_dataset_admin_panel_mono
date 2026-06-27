import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getFestivals,
  getFestivalTypeOptions,
  getFestivalStatusCounts,
} from '@/lib/db';
import { createFestival } from '@/lib/actions/festivals';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';
import FestivalsBrowser from './FestivalsBrowser';

export const metadata: Metadata = { title: 'Festivals' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function FestivalsPage() {
  const [rows, types, counts] = await Promise.all([
    getFestivals(500),
    getFestivalTypeOptions(),
    getFestivalStatusCounts(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Festivals</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {counts.total} total · {counts.published} published · {counts.in_review} in review · {counts.draft} draft · {counts.with_thangka} with thangka display · {counts.tourists_welcome} tourists-welcome
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add festival" action={async () => {
            'use server';
            const res = await createFestival();
            if (res.ok && res.id) redirect(`/festivals/${res.id}`);
          }} />
        </div>
      </div>

      <FestivalsBrowser festivals={rows} types={types} statusCounts={counts} />
    </div>
  );
}
