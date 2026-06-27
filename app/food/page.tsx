import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getCuisineItems,
  getCuisineCategoryOptions,
  getCuisineStatusCounts,
} from '@/lib/db';
import { createCuisineItem } from '@/lib/actions/cuisine';
import FoodBrowser from './FoodBrowser';
import { Button } from '@/components/ui/button';
import AddNewForm from '@/components/AddNewForm';
import { Download } from 'lucide-react';

export const metadata: Metadata = { title: 'Bhutanese Food' };

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default async function FoodPage() {
  const [items, categories, statusCounts] = await Promise.all([
    getCuisineItems({}, 500),
    getCuisineCategoryOptions(),
    getCuisineStatusCounts(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-primary" style={displayLgStyle}>Bhutanese Food &amp; Drink</h1>
          <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>
            {statusCounts.total} items · {statusCounts.published} published · {statusCounts.draft} draft · {statusCounts.vegetarian} vegetarian · {statusCounts.vegan} vegan · {statusCounts.national_dish} national · {statusCounts.ceremonial} ceremonial
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"
            className="border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg flex items-center gap-2 px-4 py-2 h-auto"
            style={titleSmStyle}>
            <Download size={16} />
            <span>Export</span>
          </Button>
          <AddNewForm label="Add item" action={async () => {
            'use server';
            const res = await createCuisineItem();
            if (res.ok && res.id) redirect(`/food/${res.id}`);
          }} />
        </div>
      </div>

      <FoodBrowser items={items} categories={categories} statusCounts={statusCounts} />
    </div>
  );
}
