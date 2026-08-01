import { notFound } from 'next/navigation';
import {
  getSpeciesById,
  getSpeciesAliases,
  getSpeciesLocations,
  getSpeciesOccurrences,
  getSpeciesSightingPoints,
  getRefConservationStatus,
  getMediaForEntity,
} from '@/lib/db';
import SpeciesDetailClient from '@/components/SpeciesDetailClient';

export default async function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const species = await getSpeciesById(id);
  if (!species) notFound();
  const [aliases, locations, occurrences, sightingPoints, conservationStatuses, media] = await Promise.all([
    getSpeciesAliases(id),
    getSpeciesLocations(id),
    getSpeciesOccurrences(id, 20),
    getSpeciesSightingPoints(id),
    getRefConservationStatus(),
    getMediaForEntity('species', id),
  ]);
  return (
    <SpeciesDetailClient
      species={species}
      aliases={aliases}
      locations={locations}
      occurrences={occurrences}
      sightingPoints={sightingPoints}
      conservationStatuses={conservationStatuses}
      media={media}
      backHref="/species"
      backLabel="Species"
      showBirdFields={species.class === 'Aves'}
    />
  );
}
