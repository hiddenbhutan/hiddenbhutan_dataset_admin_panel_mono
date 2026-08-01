import { notFound } from 'next/navigation';
import { getCulturalCustomById, getMediaForEntity } from '@/lib/db';
import CustomDetailClient from './CustomDetailClient';

export default async function CustomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const custom = await getCulturalCustomById(id);
  if (!custom) notFound();
  const media = await getMediaForEntity('cultural_custom', id);
  return <CustomDetailClient custom={custom} media={media} />;
}
