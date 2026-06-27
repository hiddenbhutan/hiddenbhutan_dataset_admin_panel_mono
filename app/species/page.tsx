import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getSpecies,
  getSpeciesStatusCounts,
  getSpeciesFamilyOptions,
  getSpeciesClassOptions,
} from '@/lib/db';
import { createSpecies } from '@/lib/actions/species';
import SpeciesBrowser from '@/components/SpeciesBrowser';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';

export const metadata: Metadata = { title: 'Species' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function SpeciesPage() {
  // Full unified browser — no kingdom/class filter applied server-side.
  const [rows, statusCounts, families, classes] = await Promise.all([
    getSpecies({}, 1000),
    getSpeciesStatusCounts({}),
    getSpeciesFamilyOptions({}),
    getSpeciesClassOptions(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Species</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {statusCounts.total} species ·{' '}
            <span className="text-on-error-container font-semibold">{statusCounts.iucn.CR} CR</span> ·{' '}
            <span className="font-semibold" style={{ color: '#6b2a14' }}>{statusCounts.iucn.EN} EN</span> ·{' '}
            <span className="text-on-secondary-container font-semibold">{statusCounts.iucn.VU} VU</span> ·{' '}
            {statusCounts.iucn.NT} NT · {statusCounts.iucn.LC} LC ·{' '}
            <span className="text-on-primary-fixed-variant font-semibold">{statusCounts.endemic_bhutan} endemic to Bhutan</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add species" action={async () => {
            'use server';
            const res = await createSpecies();
            if (res.ok && res.id) redirect(`/species/${res.id}`);
          }} />
        </div>
      </div>

      <SpeciesBrowser
        species={rows}
        statusCounts={statusCounts}
        families={families}
        detailHref="/species"
        showFamilyColumn
        showElevationColumn
        showKingdomFilter
        classOptions={classes}
      />
    </div>
  );
}
