import type { Metadata } from 'next';
import { getRefHistoricalPeriods } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Historical Periods' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '160px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '200px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '140px' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '260px' } },
  { key: 'start_year',  label: 'Start year',  type: { kind: 'int',  width: '100px' } },
  { key: 'end_year',    label: 'End year',    type: { kind: 'int',  width: '100px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function HistoricalPeriodRefPage() {
  const rows = await getRefHistoricalPeriods();
  return (
    <RefTableEditor
      tableKey="historical_period"
      title="Historical Periods"
      description="Guru era, Drukpa lineage, Zhabdrung, Wangchuck dynasty — used to slot figures and heritage sites into a timeline."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
