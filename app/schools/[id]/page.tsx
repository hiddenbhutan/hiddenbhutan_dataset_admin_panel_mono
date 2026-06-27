import { notFound } from 'next/navigation';
import { getSchoolById, getDzongkhagOptions, getGeomById, getRefSchoolCategory } from '@/lib/db';
import SchoolDetailClient from './SchoolDetailClient';

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();
  const school = await getSchoolById(id);
  if (!school) notFound();
  const [districts, categories, geom] = await Promise.all([
    getDzongkhagOptions(),
    getRefSchoolCategory(),
    getGeomById('school', id),
  ]);
  return <SchoolDetailClient school={school} districts={districts} categories={categories} initialGeom={geom} />;
}
