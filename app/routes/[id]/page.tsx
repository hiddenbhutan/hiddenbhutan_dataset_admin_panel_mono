import {
  getTrekRouteById,
  getRouteWaypoints,
  getNearbyWaypointsForRoute,
  getGeomById,
} from '@/lib/db';
import { notFound } from 'next/navigation';
import RouteDetailClient from './RouteDetailClient';

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const route = await getTrekRouteById(id);
  if (!route) notFound();

  const [waypoints, nearby, geom] = await Promise.all([
    getRouteWaypoints(id),
    getNearbyWaypointsForRoute(id, 500, 30),
    getGeomById('trek_route', id),
  ]);

  return (
    <RouteDetailClient
      route={route}
      waypoints={waypoints}
      nearby={nearby}
      contentStatus={route.content_status}
      initialGeom={geom}
    />
  );
}
