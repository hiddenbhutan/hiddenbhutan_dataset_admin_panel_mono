import type { Metadata } from 'next';
import { getRefHealthServices } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Health Services' };

const COLUMNS: RefColumn[] = [
  { key: 'code',         label: 'Code',         required: true, type: { kind: 'text', width: '160px', placeholder: 'snake_case' } },
  { key: 'label_en',     label: 'Label (EN)',   required: true, type: { kind: 'text', width: '180px' } },
  { key: 'label_dz',     label: 'Label (DZ)',   type: { kind: 'text', width: '140px' } },
  { key: 'description',  label: 'Description',  type: { kind: 'text', width: '260px' } },
  { key: 'is_emergency', label: 'Emergency',    type: { kind: 'bool' } },
  { key: 'sort_order',   label: 'Sort',         type: { kind: 'int',  width: '70px' } },
];

export default async function HealthServiceRefPage() {
  const rows = await getRefHealthServices();
  return (
    <RefTableEditor
      tableKey="health_service"
      title="Health Services"
      description="Emergency, maternity, dental, x-ray, ambulance, helipad — drives health center service badges."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
