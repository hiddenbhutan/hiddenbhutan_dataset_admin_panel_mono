import { notFound } from 'next/navigation';
import {
  getConservationAreaById,
  getManagementZones,
  getCorridorLinksFor,
  getIncomingCorridorLinks,
  getGeomById,
  getMediaForEntity,
} from '@/lib/db';
import ConservationAreaDetailClient from '@/components/ConservationAreaDetailClient';

export default async function ConservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const area = await getConservationAreaById(id);
  if (!area) notFound();
  const [zones, outgoing, incoming, geom, media] = await Promise.all([
    getManagementZones(id),
    getCorridorLinksFor(id),
    getIncomingCorridorLinks(id),
    getGeomById('conservation_area', id),
    getMediaForEntity('conservation_area', id),
  ]);
  return (
    <ConservationAreaDetailClient
      area={area}
      outgoingLinks={outgoing}
      incomingLinks={incoming}
      zones={zones}
      backHref="/conservation"
      backLabel="Conservation Areas"
      initialGeom={geom}
      entityType="conservation_area"
      media={media}
    />
  );
}
