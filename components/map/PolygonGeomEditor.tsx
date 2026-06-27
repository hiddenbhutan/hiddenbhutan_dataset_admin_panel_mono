'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import PolygonDrawer from './PolygonDrawer';
import MapView, { type GeomGeoJSON } from './MapView';
import { updateGeom, type GeomEntity } from '@/lib/actions/geom';

interface Props {
  entity: GeomEntity;
  id: number;
  initial: GeomGeoJSON | null;
  editable?: boolean;
  height?: string;
}

/**
 * Conservation area / biological corridor geometry editor. Read-only preview by
 * default; toggleable into a polygon-draw mode that saves a MultiPolygon.
 */
export default function PolygonGeomEditor({
  entity, id, initial, editable = true, height = '400px',
}: Props) {
  const [geom, setGeom] = useState<GeomGeoJSON | null>(initial);
  const [drawing, setDrawing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(next: GeomGeoJSON | null) {
    if (!next) {
      toast.error('Add at least one polygon before saving');
      return;
    }
    startTransition(async () => {
      const res = await updateGeom({ entity, id, geom: next });
      if (res.ok) {
        setGeom(next);
        setDrawing(false);
        toast.success('Area geometry saved');
      } else {
        toast.error(res.message ?? 'Geometry save failed');
      }
    });
  }

  if (!editable || !drawing) {
    return (
      <div className="space-y-2">
        <MapView geom={geom} height={height} />
        {editable && (
          <div className="flex justify-between items-center text-xs text-outline">
            <span>{geom ? describeGeom(geom) : 'No geometry yet'}</span>
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
      <PolygonDrawer initial={geom} onSave={handleSave} height={height} />
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
  if (g.type === 'MultiPolygon') return `${g.coordinates.length} polygon${g.coordinates.length === 1 ? '' : 's'}`;
  if (g.type === 'Polygon')      return '1 polygon';
  return g.type;
}
