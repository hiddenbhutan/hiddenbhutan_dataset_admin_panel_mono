import type { Metadata } from 'next';
import { getRefConservationStatus } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Conservation Status' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '110px', placeholder: 'e.g. vu' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '110px', placeholder: 'e.g. VU' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '120px' } },
  { key: 'full_form',   label: 'Full form',   type: { kind: 'text', width: '200px', placeholder: 'e.g. Vulnerable' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '360px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function ConservationStatusRefPage() {
  const rows = await getRefConservationStatus();
  return (
    <RefTableEditor
      tableKey="conservation_status"
      title="Conservation Status"
      description="IUCN Red List categories (EX, EW, CR, EN, VU, NT, LC, DD, NE) — the code, full form, and definition shown on species, global + Bhutan assessments."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
