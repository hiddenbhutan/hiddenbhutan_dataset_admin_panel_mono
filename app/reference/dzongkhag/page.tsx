import type { Metadata } from 'next';
import { getRefDzongkhags } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Dzongkhags' };

const REGION_OPTS = [
  { value: 'east',    label: 'East' },
  { value: 'west',    label: 'West' },
  { value: 'central', label: 'Central' },
  { value: 'south',   label: 'South' },
];

const COLUMNS: RefColumn[] = [
  { key: 'code',    label: 'Code',     type: { kind: 'text', width: '120px', placeholder: 'Official code' } },
  { key: 'name_en', label: 'Name (EN)', required: true, type: { kind: 'text', width: '220px' } },
  { key: 'name_dz', label: 'Name (DZ)', type: { kind: 'text', width: '180px' } },
  { key: 'region',  label: 'Region',    type: { kind: 'enum', options: REGION_OPTS } },
];

export default async function DzongkhagRefPage() {
  const rows = await getRefDzongkhags();
  return (
    <RefTableEditor
      tableKey="dzongkhag"
      title="Dzongkhags"
      description="The 20 dzongkhags (districts). Top of Bhutan's administrative hierarchy; referenced by villages, schools, health centers, heritage sites, and more."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
