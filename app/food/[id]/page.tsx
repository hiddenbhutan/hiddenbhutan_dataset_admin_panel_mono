import { notFound } from 'next/navigation';
import {
  getCuisineItemById,
  getCuisineCategoryOptions,
  getCuisineItemIngredients,
  getCuisineItemLocations,
  getDzongkhags,
} from '@/lib/db';
import FoodDetailClient from './FoodDetailClient';

export default async function FoodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const item = await getCuisineItemById(id);
  if (!item) notFound();
  const [categories, ingredients, locations, dzongkhags] = await Promise.all([
    getCuisineCategoryOptions(),
    getCuisineItemIngredients(id),
    getCuisineItemLocations(id),
    getDzongkhags(),
  ]);
  return (
    <FoodDetailClient
      item={item}
      categories={categories}
      ingredients={ingredients}
      locations={locations}
      dzongkhags={dzongkhags.map(d => ({ id: d.id, code: null, label: d.name }))}
    />
  );
}
