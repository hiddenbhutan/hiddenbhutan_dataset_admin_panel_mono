'use client';

/**
 * Editable Point preview for a content row. Renders MapView; on marker drop,
 * persists the new lon/lat via the geom server action and shows a toast.
 */

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import MapView, { type GeomGeoJSON } from './MapView';
import { updateGeom, type GeomEntity } from '@/lib/actions/geom';

interface Props {
  entity: GeomEntity;
  id: number;
  initial: GeomGeoJSON | null;
  /** Pass true to allow editing (drag marker). Otherwise read-only preview. */
  editable?: boolean;
  /** Optional callback fired after a successful save (e.g. to refresh sibling state). */
  onSaved?: (geom: GeomGeoJSON) => void;
  height?: string;
}

export default function PointGeomEditor({
  entity, id, initial, editable = true, onSaved, height = '320px',
}: Props) {
  const [geom, setGeom] = useState<GeomGeoJSON | null>(initial);
  const [pending, startTransition] = useTransition();

  function persist(next: GeomGeoJSON) {
    setGeom(next);
    startTransition(async () => {
      const res = await updateGeom({ entity, id, geom: next });
      if (res.ok) {
        toast.success('Location saved');
        onSaved?.(next);
      } else {
        toast.error(res.message ?? 'Geometry save failed');
      }
    });
  }

  function handlePointPlace(lon: number, lat: number) {
    persist({ type: 'Point', coordinates: [lon, lat] });
  }

  function handlePointChange(lon: number, lat: number) {
    persist({ type: 'Point', coordinates: [lon, lat] });
  }

  return (
    <div className="space-y-1">
      <MapView
        geom={geom}
        draggablePoint={editable}
        onPointChange={handlePointChange}
        onPointPlace={handlePointPlace}
        height={height}
      />
      <div className="flex items-center justify-between text-xs text-outline">
        <span>
          {geom?.type === 'Point' && Array.isArray(geom.coordinates)
            ? `${geom.coordinates[1].toFixed(5)}°, ${geom.coordinates[0].toFixed(5)}°`
            : 'No location yet — click the map to place a marker'}
        </span>
        {pending && <span>Saving…</span>}
      </div>
    </div>
  );
}
