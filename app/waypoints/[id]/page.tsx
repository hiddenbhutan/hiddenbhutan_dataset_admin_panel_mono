import { notFound } from 'next/navigation';
import {
  getWaypointById,
  getRefWaypointTypes,
  getDzongkhagOptions,
  getGeomById,
  getMediaForEntity,
} from '@/lib/db';
import WaypointDetailClient from './WaypointDetailClient';

export default async function WaypointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const wp = await getWaypointById(id);
  if (!wp) notFound();
  const [types, districts, geom, media] = await Promise.all([
    getRefWaypointTypes(),
    getDzongkhagOptions(),
    getGeomById('waypoint', id),
    getMediaForEntity('waypoint', id),
  ]);
  return <WaypointDetailClient waypoint={wp} types={types} districts={districts} initialGeom={geom} media={media} />;
}
