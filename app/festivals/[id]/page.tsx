import { notFound } from 'next/navigation';
import {
  getFestivalById,
  getFestivalOccurrences,
  getFestivalVenues,
  getFestivalHighlights,
  getFestivalVisitorTips,
  getFestivalFigures,
  getFestivalThangkaDisplays,
  getFestivalTypeOptions,
} from '@/lib/db';
import FestivalDetailClient from './FestivalDetailClient';

export default async function FestivalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const festival = await getFestivalById(id);
  if (!festival) notFound();

  const [occurrences, venues, highlights, tips, figures, thangkaDisplays, types] = await Promise.all([
    getFestivalOccurrences(id, 6),
    getFestivalVenues(id),
    getFestivalHighlights(id),
    getFestivalVisitorTips(id),
    getFestivalFigures(id),
    getFestivalThangkaDisplays(id),
    getFestivalTypeOptions(),
  ]);

  return (
    <FestivalDetailClient
      festival={festival}
      occurrences={occurrences}
      venues={venues}
      highlights={highlights}
      tips={tips}
      figures={figures}
      thangkaDisplays={thangkaDisplays}
      types={types}
    />
  );
}
