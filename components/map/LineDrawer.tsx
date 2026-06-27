'use client';

/**
 * Line drawing surface for trek routes.
 *
 * Renders a MapLibre map + terra-draw LineString mode. The "Save line" button
 * surfaces the current drawing as a GeoJSON MultiLineString to the parent;
 * "Clear" wipes the canvas.
 *
 * The parent owns the geom — this component just hosts the drawing UI and emits
 * the result. trek_route.geom is geometry(MultiLineString, 4326), so when the
 * user draws a single LineString we wrap it in a MultiLineString of one part.
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { LngLatBounds, type Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TerraDraw, TerraDrawLineStringMode, TerraDrawSelectMode } from 'terra-draw';
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
  /** Initial geometry (Line / MultiLine). Used to seed the drawing canvas. */
  initial?: GeomGeoJSON | null;
  /**
   * Called when the user clicks "Save line". Receives a GeoJSON MultiLineString
   * built from the current drawing, or null if the canvas is empty.
   */
  onSave: (geom: GeomGeoJSON | null) => void;
  height?: string;
}

type LineCoords = [number, number][];

interface DrawnLineFeature {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: LineCoords };
  properties: { id?: string };
}

export default function LineDrawer({ initial, onSave, height = '400px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const [mode, setMode] = useState<'draw' | 'select'>('draw');
  const [lineCount, setLineCount] = useState(0);

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
          new TerraDrawLineStringMode(),
          new TerraDrawSelectMode({
            flags: { linestring: { feature: { draggable: true } } },
          }),
        ],
      });
      draw.start();
      draw.setMode('linestring');
      drawRef.current = draw;

      // Seed with initial geometry, if any.
      if (initial) {
        const lines: LineCoords[] = [];
        if (initial.type === 'LineString') lines.push(initial.coordinates);
        else if (initial.type === 'MultiLineString') lines.push(...initial.coordinates);
        if (lines.length > 0) {
          draw.addFeatures(lines.map((coords) => ({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: { mode: 'linestring' },
          })));
          const bounds = bboxOf(lines.flat());
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 14 });
          setLineCount(lines.length);
        }
      }

      // Track feature count so the Save button can show how many lines we'll save.
      draw.on('finish', () => {
        const snapshot = draw.getSnapshot() as DrawnLineFeature[];
        setLineCount(snapshot.filter(f => f.geometry?.type === 'LineString').length);
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
    drawRef.current.setMode(next === 'draw' ? 'linestring' : 'select');
  }

  function clearAll() {
    if (!drawRef.current) return;
    drawRef.current.clear();
    setLineCount(0);
  }

  function handleSave() {
    if (!drawRef.current) return;
    const snapshot = drawRef.current.getSnapshot() as DrawnLineFeature[];
    const lines = snapshot
      .filter(f => f.geometry?.type === 'LineString')
      .map(f => f.geometry.coordinates as LineCoords)
      .filter(c => c.length >= 2);
    if (lines.length === 0) {
      onSave(null);
      return;
    }
    onSave({ type: 'MultiLineString', coordinates: lines });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 border border-outline-variant rounded-md bg-surface-container-low p-1">
          <button type="button" onClick={() => switchMode('draw')}
            className={`px-3 h-8 rounded text-xs font-semibold transition-colors ${mode === 'draw' ? 'bg-on-primary-fixed-variant text-tertiary-fixed' : 'text-on-surface hover:bg-surface-container'}`}>
            Draw line
          </button>
          <button type="button" onClick={() => switchMode('select')}
            className={`px-3 h-8 rounded text-xs font-semibold transition-colors ${mode === 'select' ? 'bg-on-primary-fixed-variant text-tertiary-fixed' : 'text-on-surface hover:bg-surface-container'}`}>
            Select / move
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-on-surface-variant">{lineCount} line{lineCount === 1 ? '' : 's'}</span>
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
        Click to add vertices; press <kbd>Enter</kbd> or double-click to finish a line. Switch to <em>Select / move</em> to drag vertices.
      </p>
    </div>
  );
}
