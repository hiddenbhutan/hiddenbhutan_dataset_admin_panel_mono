import type { Metadata } from 'next';
import { getRefCuisineCategories } from '@/lib/db';
import RefTableEditor, { type RefColumn } from '@/components/RefTableEditor';

export const metadata: Metadata = { title: 'Cuisine Categories' };

const COLUMNS: RefColumn[] = [
  { key: 'code',        label: 'Code',        required: true, type: { kind: 'text', width: '160px', placeholder: 'snake_case' } },
  { key: 'label_en',    label: 'Label (EN)',  required: true, type: { kind: 'text', width: '180px' } },
  { key: 'label_dz',    label: 'Label (DZ)',  type: { kind: 'text', width: '140px' } },
  { key: 'description', label: 'Description', type: { kind: 'text', width: '260px' } },
  { key: 'icon',        label: 'Icon',        type: { kind: 'text', width: '110px' } },
  { key: 'sort_order',  label: 'Sort',        type: { kind: 'int',  width: '70px' } },
];

export default async function CuisineCategoryRefPage() {
  const rows = await getRefCuisineCategories();
  return (
    <RefTableEditor
      tableKey="cuisine_category"
      title="Cuisine Categories"
      description="Main, side, snack, beverage, alcohol, dessert, condiment, ceremonial — used to group dishes + drinks."
      rows={rows}
      columns={COLUMNS}
    />
  );
}
