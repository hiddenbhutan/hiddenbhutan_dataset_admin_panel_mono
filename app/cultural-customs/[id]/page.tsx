import { notFound } from 'next/navigation';
import { getCulturalCustomById } from '@/lib/db';
import CustomDetailClient from './CustomDetailClient';

export default async function CustomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const custom = await getCulturalCustomById(id);
  if (!custom) notFound();
  return <CustomDetailClient custom={custom} />;
}
