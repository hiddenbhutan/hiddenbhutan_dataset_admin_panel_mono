import type { Metadata } from 'next';
import { getRefWaypointTypes } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Waypoint Types' };

const CATEGORY_OPTS = [
  { value: 'trail', label: 'Trail' },
  { value: 'water', label: 'Water' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'facility', label: 'Facility' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'nature', label: 'Nature' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'safety', label: 'Safety' },
];

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '140px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '180px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '140px' } },
  { key: 'category',    label: 'Category',    required: true, type: { kind: 'enum', options: CATEGORY_OPTS } },
  { key: 'icon',        label: 'Icon',        type: { kind: 'text', width: '110px' } },
  { key: 'color',       label: 'Color',       type: { kind: 'text', width: '90px',  placeholder: '#RRGGBB' } },
  { key: 'min_zoom',    label: 'Min zoom',    type: { kind: 'int',  width: '80px', min: 0, max: 22 } },
  { key: 'show_in_app', label: 'In app',      type: { kind: 'bool' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function WaypointTypeRefPage() {
  const rows = await getRefWaypointTypes();
  return (
    <RefTableEditor
      tableKey="waypoint_type"
      title="Waypoint Types"
      description="Drives waypoint icons, grouping, and zoom-based visibility on the trail map."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
