import { notFound } from 'next/navigation';
import { getLocalityById, getDzongkhagOptions, getGeomById, getMediaForEntity } from '@/lib/db';
import LocalityDetailClient from '@/components/LocalityDetailClient';

export default async function VillageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const locality = await getLocalityById(id);
  if (!locality) notFound();
  const [districts, geom, media] = await Promise.all([
    getDzongkhagOptions(),
    getGeomById('locality', id),
    getMediaForEntity('locality', id),
  ]);
  return <LocalityDetailClient locality={locality} districts={districts}
    backHref="/villages" backLabel="Villages" initialGeom={geom} media={media} />;
}
