'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import LineDrawer from './LineDrawer';
import MapView, { type GeomGeoJSON, type MapMarker } from './MapView';
import { updateGeom, type GeomEntity } from '@/lib/actions/geom';

interface Props {
  entity: GeomEntity;
  id: number;
  initial: GeomGeoJSON | null;
  /** When true, show the drawer UI; otherwise read-only preview. */
  editable?: boolean;
  /** Extra markers (eg. on-route + nearby waypoints) layered over the read-only preview. */
  markers?: MapMarker[];
  height?: string;
}

/**
 * Trek route geometry editor: read-only preview by default; toggleable into a
 * draw mode that saves the resulting MultiLineString via the geom action.
 */
export default function LineGeomEditor({
  entity, id, initial, editable = true, markers, height = '400px',
}: Props) {
  const [geom, setGeom] = useState<GeomGeoJSON | null>(initial);
  const [drawing, setDrawing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(next: GeomGeoJSON | null) {
    if (!next) {
      toast.error('Add at least one line before saving');
      return;
    }
    startTransition(async () => {
      const res = await updateGeom({ entity, id, geom: next });
      if (res.ok) {
        setGeom(next);
        setDrawing(false);
        toast.success('Route geometry saved');
      } else {
        toast.error(res.message ?? 'Geometry save failed');
      }
    });
  }

  if (!editable || !drawing) {
    return (
      <div className="space-y-2">
        <MapView geom={geom} markers={markers} height={height} />
        {editable && (
          <div className="flex justify-between items-center text-xs text-outline">
            <span>
              {geom ? `${describeGeom(geom)}` : 'No geometry yet'}
            </span>
            <button type="button" onClick={() => setDrawing(true)}
              className="px-3 h-8 rounded bg-on-primary-fixed-variant text-tertiary-fixed text-xs font-semibold">
              Edit on map
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <LineDrawer initial={geom} onSave={handleSave} height={height} />
      <div className="flex justify-end items-center gap-2">
        {pending && <span className="text-xs text-outline">Saving…</span>}
        <button type="button" onClick={() => setDrawing(false)}
          className="px-3 h-8 rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface">
          Cancel
        </button>
      </div>
    </div>
  );
}

function describeGeom(g: GeomGeoJSON): string {
  if (g.type === 'MultiLineString') return `${g.coordinates.length} line${g.coordinates.length === 1 ? '' : 's'}`;
  if (g.type === 'LineString')      return '1 line';
  return g.type;
}
