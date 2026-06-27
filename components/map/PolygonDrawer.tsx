'use client';

/**
 * Polygon drawing surface for conservation areas + biological corridors.
 *
 * conservation_area.geom is geometry(MultiPolygon, 4326), so we wrap whatever
 * the user draws — even a single polygon — into a MultiPolygon before emitting.
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { LngLatBounds, type Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

import type { GeomGeoJSON } from './MapView';

const BHUTAN_BOUNDS: [[number, number], [number, number]] = [
  [88.5, 26.6],
  [92.3, 28.5],
];

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm-raster', type: 'raster' as const, source: 'osm' }],
};

function bboxOf(coords: [number, number][]): LngLatBounds {
  const bounds = new LngLatBounds();
  coords.forEach((c) => bounds.extend(c));
  return bounds;
}

interface Props {
  initial?: GeomGeoJSON | null;
  onSave: (geom: GeomGeoJSON | null) => void;
  height?: string;
}

type Ring = [number, number][];

interface DrawnPolygonFeature {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: Ring[] };
  properties: { id?: string };
}

export default function PolygonDrawer({ initial, onSave, height = '400px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const [mode, setMode] = useState<'draw' | 'select'>('draw');
  const [polyCount, setPolyCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      bounds: BHUTAN_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode(),
          new TerraDrawSelectMode({
            flags: { polygon: { feature: { draggable: true } } },
          }),
        ],
      });
      draw.start();
      draw.setMode('polygon');
      drawRef.current = draw;

      if (initial) {
        const polys: Ring[][] = [];
        if (initial.type === 'Polygon')      polys.push(initial.coordinates);
        else if (initial.type === 'MultiPolygon') polys.push(...initial.coordinates);
        if (polys.length > 0) {
          draw.addFeatures(polys.map((rings) => ({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: rings },
            properties: { mode: 'polygon' },
          })));
          const allCoords = polys.flat(2);
          const bounds = bboxOf(allCoords);
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 14 });
          setPolyCount(polys.length);
        }
      }

      draw.on('finish', () => {
        const snapshot = draw.getSnapshot() as DrawnPolygonFeature[];
        setPolyCount(snapshot.filter(f => f.geometry?.type === 'Polygon').length);
      });
    });

    return () => {
      if (drawRef.current) { try { drawRef.current.stop(); } catch { /* ignore */ } drawRef.current = null; }
      map.remove();
      mapRef.current = null;
    };
  }, [initial]);

  function switchMode(next: 'draw' | 'select') {
    setMode(next);
    if (!drawRef.current) return;
    drawRef.current.setMode(next === 'draw' ? 'polygon' : 'select');
  }

  function clearAll() {
    if (!drawRef.current) return;
    drawRef.current.clear();
    setPolyCount(0);
  }

  function handleSave() {
    if (!drawRef.current) return;
    const snapshot = drawRef.current.getSnapshot() as DrawnPolygonFeature[];
    const polys = snapshot
      .filter(f => f.geometry?.type === 'Polygon')
      .map(f => f.geometry.coordinates as Ring[]);
    if (polys.length === 0) {
      onSave(null);
      return;
    }
    onSave({ type: 'MultiPolygon', coordinates: polys });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 border border-outline-variant rounded-md bg-surface-container-low p-1">
          <button type="button" onClick={() => switchMode('draw')}
            className={`px-3 h-8 rounded text-xs font-semibold transition-colors ${mode === 'draw' ? 'bg-on-primary-fixed-variant text-tertiary-fixed' : 'text-on-surface hover:bg-surface-container'}`}>
            Draw polygon
          </button>
          <button type="button" onClick={() => switchMode('select')}
            className={`px-3 h-8 rounded text-xs font-semibold transition-colors ${mode === 'select' ? 'bg-on-primary-fixed-variant text-tertiary-fixed' : 'text-on-surface hover:bg-surface-container'}`}>
            Select / move
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-on-surface-variant">{polyCount} polygon{polyCount === 1 ? '' : 's'}</span>
          <button type="button" onClick={clearAll}
            className="px-3 h-8 rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface">
            Clear all
          </button>
          <button type="button" onClick={handleSave}
            className="px-3 h-8 rounded bg-on-primary-fixed-variant text-tertiary-fixed text-xs font-semibold">
            Save geometry
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ width: '100%', height, borderRadius: '12px', overflow: 'hidden' }} />
      <p className="text-xs text-outline">
        Click to add vertices; press <kbd>Enter</kbd> or double-click the first vertex to close the polygon. Switch to <em>Select / move</em> to drag the whole shape.
      </p>
    </div>
  );
}
