import type { Metadata } from 'next';
import { getRefFestivalTypes } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Festival Types' };

const COLUMNS: RefColumn[] = [
  { key: 'code',         label: 'Code',         required: true, type: { kind: 'text', width: '160px', placeholder: 'snake_case' } },
  { key: 'label_en',     label: 'Label (EN)',   required: true, type: { kind: 'text', width: '200px' } },
  { key: 'label_dz',     label: 'Label (DZ)',   type: { kind: 'text', width: '140px' } },
  { key: 'description',  label: 'Description',  type: { kind: 'text', width: '260px' } },
  { key: 'is_religious', label: 'Religious',    type: { kind: 'bool' } },
  { key: 'icon',         label: 'Icon',         type: { kind: 'text', width: '110px' } },
  { key: 'sort_order',   label: 'Sort',         type: { kind: 'int',  width: '70px' } },
];

export default async function FestivalTypeRefPage() {
  const rows = await getRefFestivalTypes();
  return (
    <RefTableEditor
      tableKey="festival_type"
      title="Festival Types"
      description="Tshechu, drupchen, mewang, mani rimdu, losar, harvest, secular — categorizes festivals."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
