import { notFound } from 'next/navigation';
import {
  getCuisineIngredientById, getCuisineIngredientDishes, getSpeciesOptions, getMediaForEntity,
} from '@/lib/db';
import IngredientDetailClient from './IngredientDetailClient';

export default async function CuisineIngredientDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const ingredient = await getCuisineIngredientById(id);
  if (!ingredient) notFound();
  const [species, dishes, media] = await Promise.all([
    getSpeciesOptions(),
    getCuisineIngredientDishes(id),
    getMediaForEntity('cuisine_ingredient', id),
  ]);
  return <IngredientDetailClient ingredient={ingredient} species={species} dishes={dishes} media={media} />;
}
