import {
  getHeritageSiteById,
  getHeritageTypeOptions,
  getHistoricalPeriodOptions,
  getHistoricalFigureOptions,
  getTrekRouteOptions,
  getGeomById,
} from '@/lib/db';
import { notFound } from 'next/navigation';
import HeritageDetailClient from './HeritageDetailClient';

export default async function HeritageDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const [site, types, periods, figures, trekRoutes, geom] = await Promise.all([
    getHeritageSiteById(id),
    getHeritageTypeOptions(),
    getHistoricalPeriodOptions(),
    getHistoricalFigureOptions(),
    getTrekRouteOptions(),
    getGeomById('heritage_site', id),
  ]);
  if (!site) notFound();
  return (
    <HeritageDetailClient
      site={site}
      heritageTypes={types}
      periods={periods}
      figures={figures}
      trekRoutes={trekRoutes}
      initialGeom={geom}
    />
  );
}
