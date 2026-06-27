import type { Metadata } from 'next';
import { getRefHeritageTypes } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Heritage Types' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '140px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '180px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '140px' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '260px' } },
  { key: 'icon',        label: 'Icon',        type: { kind: 'text', width: '110px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function HeritageTypeRefPage() {
  const rows = await getRefHeritageTypes();
  return (
    <RefTableEditor
      tableKey="heritage_type"
      title="Heritage Types"
      description="Lhakhang, goemba, chorten, nye, hermitage, ruins — categorizes heritage sites + drives map icons."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
