import { notFound } from 'next/navigation';
import {
  getNationalSymbolById,
  getSpeciesOptions,
  getHistoricalFigureOptions,
} from '@/lib/db';
import SymbolDetailClient from './SymbolDetailClient';

export default async function SymbolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const symbol = await getNationalSymbolById(id);
  if (!symbol) notFound();
  const [species, figures] = await Promise.all([
    getSpeciesOptions(),
    getHistoricalFigureOptions(),
  ]);
  return <SymbolDetailClient symbol={symbol} species={species} figures={figures} />;
}
