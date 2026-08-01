import { notFound } from 'next/navigation';
import { getHistoricalFigureById, getHistoricalPeriodOptions, getMediaForEntity } from '@/lib/db';
import FigureDetailClient from './FigureDetailClient';

export default async function FigureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const figure = await getHistoricalFigureById(id);
  if (!figure) notFound();
  const [periods, media] = await Promise.all([
    getHistoricalPeriodOptions(),
    getMediaForEntity('historical_figure', id),
  ]);
  return <FigureDetailClient figure={figure} periods={periods} media={media} />;
}
