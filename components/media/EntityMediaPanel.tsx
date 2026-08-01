import type { MediaEntityType, MediaItem } from '@/lib/db';
import MediaUploadForm from './MediaUploadForm';
import MediaCard from './MediaCard';

/**
 * Drop-in "Media" tab content for any entity detail page. Server-fetch the
 * entity's media (getMediaForEntity) and pass it in as `items`.
 */
export default function EntityMediaPanel({
  entityType,
  entityId,
  items,
  revalidatePaths,
}: {
  entityType: MediaEntityType;
  entityId: number;
  items: MediaItem[];
  revalidatePaths: string[];
}) {
  return (
    <div className="space-y-4">
      <MediaUploadForm fixedEntityType={entityType} fixedEntityId={entityId} revalidatePaths={revalidatePaths} />

      {items.length === 0 ? (
        <div className="text-center py-8 text-outline" style={{ fontSize: '14px' }}>
          No media uploaded for this {entityType.replace(/_/g, ' ')} yet.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {items.map(item => (
            <MediaCard key={item.id} item={item} revalidatePaths={revalidatePaths} />
          ))}
        </div>
      )}
    </div>
  );
}
