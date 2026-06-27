import type { Metadata } from 'next';
import { getRefHealthCenterTypes } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Health Center Types' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '170px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '150px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '120px' } },
  { key: 'full_form',   label: 'Full form',   type: { kind: 'text', width: '220px', placeholder: 'e.g. Basic Health Unit, Grade II' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '320px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function HealthCenterTypeRefPage() {
  const rows = await getRefHealthCenterTypes();
  return (
    <RefTableEditor
      tableKey="health_center_type"
      title="Health Center Types"
      description="ORC, BHU I/II, PHC, district / regional / national referral hospital — the facility tiers, with full form + description shown in the health center editor."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
