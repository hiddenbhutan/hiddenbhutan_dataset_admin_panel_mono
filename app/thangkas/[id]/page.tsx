import { notFound } from 'next/navigation';
import {
  getThangkaById, getThangkaFestivalDisplays,
  getHistoricalFigureOptions, getDzongOptions, getHeritageSiteOptions,
  getMediaForEntity,
} from '@/lib/db';
import ThangkaDetailClient from './ThangkaDetailClient';

export default async function ThangkaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const thangka = await getThangkaById(id);
  if (!thangka) notFound();
  const [figures, dzongs, heritageSites, festivalDisplays, media] = await Promise.all([
    getHistoricalFigureOptions(),
    getDzongOptions(),
    getHeritageSiteOptions(),
    getThangkaFestivalDisplays(id),
    getMediaForEntity('thangka', id),
  ]);
  return (
    <ThangkaDetailClient
      thangka={thangka}
      figures={figures}
      dzongs={dzongs}
      heritageSites={heritageSites}
      festivalDisplays={festivalDisplays}
      media={media}
    />
  );
}
