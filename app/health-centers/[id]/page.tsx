import { notFound } from 'next/navigation';
import { getHealthCenterById, getDzongkhagOptions, getGeomById, getRefHealthCenterTypes, getMediaForEntity } from '@/lib/db';
import HealthCenterDetailClient from './HealthCenterDetailClient';

export default async function HealthCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const hc = await getHealthCenterById(id);
  if (!hc) notFound();
  const [districts, types, geom, media] = await Promise.all([
    getDzongkhagOptions(),
    getRefHealthCenterTypes(),
    getGeomById('health_center', id),
    getMediaForEntity('health_center', id),
  ]);
  return <HealthCenterDetailClient hc={hc} districts={districts} types={types} initialGeom={geom} media={media} />;
}
