import type { Metadata } from 'next';
import { getRefSchoolCategory } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'School Categories' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '170px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '160px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '120px' } },
  { key: 'full_form',   label: 'Full form',   type: { kind: 'text', width: '220px', placeholder: 'e.g. Higher Secondary School' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '320px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function SchoolCategoryRefPage() {
  const rows = await getRefSchoolCategory();
  return (
    <RefTableEditor
      tableKey="school_category"
      title="School Categories"
      description="Community primary, primary, lower / middle / higher secondary, autonomous, private, monastic, institute — the school classification, with full form + description."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
