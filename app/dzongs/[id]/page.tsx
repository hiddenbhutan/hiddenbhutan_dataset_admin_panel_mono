import {
  getDzongById,
  getDzongLhakhangs,
  getHistoricalPeriodOptions,
  getHistoricalFigureOptions,
  getGeomById,
} from '@/lib/db';
import { notFound } from 'next/navigation';
import DzongDetailClient from './DzongDetailClient';

export default async function DzongDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const dzong = await getDzongById(id);
  if (!dzong) notFound();
  const [lhakhangs, periods, figures, geom] = await Promise.all([
    getDzongLhakhangs(id),
    getHistoricalPeriodOptions(),
    getHistoricalFigureOptions(),
    getGeomById('dzong', id),
  ]);
  return (
    <DzongDetailClient
      dzong={dzong}
      lhakhangs={lhakhangs}
      periods={periods}
      figures={figures}
      initialGeom={geom}
    />
  );
}
