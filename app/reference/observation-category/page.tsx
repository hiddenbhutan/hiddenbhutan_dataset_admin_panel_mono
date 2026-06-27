import type { Metadata } from 'next';
import { getRefObservationCategory } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Sighting Categories' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '170px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '160px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '120px' } },
  { key: 'full_form',   label: 'Full form',   type: { kind: 'text', width: '240px', placeholder: 'e.g. Bhutan Biodiversity Portal' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '320px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function ObservationCategoryRefPage() {
  const rows = await getRefObservationCategory();
  return (
    <RefTableEditor
      tableKey="observation_category"
      title="Sighting Categories"
      description="Where/how a species sighting was recorded — Biodiversity Portal, expert survey, GBIF, eBird, iNaturalist, etc. Categorizes content.species_occurrence."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
