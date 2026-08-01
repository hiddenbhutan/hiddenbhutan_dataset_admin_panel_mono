import { notFound } from 'next/navigation';
import { getZorigChusumById, getMediaForEntity } from '@/lib/db';
import CraftDetailClient from './CraftDetailClient';

export default async function CraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const craft = await getZorigChusumById(id);
  if (!craft) notFound();
  const media = await getMediaForEntity('zorig_chusum', id);
  return <CraftDetailClient craft={craft} media={media} />;
}
