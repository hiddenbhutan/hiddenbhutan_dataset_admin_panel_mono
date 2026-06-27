import { notFound } from 'next/navigation';
import { getTraditionalGameById } from '@/lib/db';
import GameDetailClient from './GameDetailClient';

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const game = await getTraditionalGameById(id);
  if (!game) notFound();
  return <GameDetailClient game={game} />;
}
