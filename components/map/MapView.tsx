'use client';

/**
 * Shared MapLibre map component for the admin app.
 *
 * Uses MapLibre GL with OpenStreetMap raster tiles — no Mapbox token needed.
 * Renders one optional GeoJSON geometry as a styled layer; optionally lets the
 * user drag the marker (Point) or draw a Line/Polygon to replace the existing
 * shape. Editing modes are off by default — pass a callback to enable them.
 *
 * Bhutan default extent fits the whole country; if a geometry is provided we
 * fit to its bounds instead.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl, { LngLat, LngLatBounds, type Map, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/** Accepted GeoJSON geometry shapes. */
export type GeomGeoJSON =
  | { type: 'Point';            coordinates: [number, number] }
  | { type: 'LineString';       coordinates: [number, number][] }
  | { type: 'MultiLineString';  coordinates: [number, number][][] }
  | { type: 'Polygon';          coordinates: [number, number][][] }
  | { type: 'MultiPolygon';     coordinates: [number, number][][][] };

/**
 * Bhutan bounding box (roughly): 88.74°E to 92.13°E, 26.70°N to 28.34°N.
 * Used as the default extent when no geometry is supplied.
 */
const BHUTAN_BOUNDS: [[number, number], [number, number]] = [
  [88.5, 26.6],
  [92.3, 28.5],
];
const THIMPHU_CENTER: [number, number] = [89.6390, 27.4716];

/**
 * Minimal MapLibre style: OSM raster tiles + an attribution control. Free + no
 * token. The style spec is a JS object so we don't need a hosted style URL.
 */
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm-raster', type: 'raster' as const, source: 'osm' }],
};

/** Decorative point marker rendered as a colored circle with optional label/title/icon. */
export interface MapMarker {
  key: string;
  lon: number;
  lat: number;
  /** Hex fill color for the marker dot. */
  color: string;
  /** Optional short text/number rendered inside the marker (e.g. sequence #). Ignored when `icon` is set. */
  label?: string | number;
  /** Optional React node (typically a lucide icon) rendered inside the marker. Wins over `label`. */
  icon?: ReactNode;
  /** Optional tooltip — appears in the title attribute. */
  title?: string;
  /** Click handler. */
  onClick?: () => void;
  /** Marker pixel size. Default 18. */
  size?: number;
}

interface MapViewProps {
  /** Initial / current geometry. Map fits its bounds on load. */
  geom?: GeomGeoJSON | null;
  /** Height in CSS units, e.g. "300px". */
  height?: string;
  /** If true, render the existing point with a draggable marker. Calls onPointChange on drop. */
  draggablePoint?: boolean;
  /** Called when the user drags the point marker. */
  onPointChange?: (lon: number, lat: number) => void;
  /** Called when the user clicks the map (only when draggablePoint is true and no marker yet). */
  onPointPlace?: (lon: number, lat: number) => void;
  /** Extra decorative markers (e.g. waypoints) layered above the geom. */
  markers?: MapMarker[];
  /** Optional className applied to the wrapper div. */
  className?: string;
}

function bboxOfGeom(g: GeomGeoJSON): LngLatBounds {
  const bounds = new LngLatBounds();
  if (g.type === 'Point') {
    bounds.extend(g.coordinates as [number, number]);
  } else if (g.type === 'LineString') {
    g.coordinates.forEach((c) => bounds.extend(c as [number, number]));
  } else if (g.type === 'MultiLineString') {
    g.coordinates.flat().forEach((c) => bounds.extend(c as [number, number]));
  } else if (g.type === 'Polygon') {
    g.coordinates.flat().forEach((c) => bounds.extend(c as [number, number]));
  } else if (g.type === 'MultiPolygon') {
    g.coordinates.flat(2).forEach((c) => bounds.extend(c as [number, number]));
  }
  return bounds;
}

export default function MapView({
  geom, height = '320px', draggablePoint = false, onPointChange, onPointPlace, markers, className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  /** DOM-marker registry for the optional `markers` prop. */
  const extraMarkersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);

  // Initialise the map exactly once.
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
      setReady(true);
    });
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Click-to-place handler (only when no marker exists yet AND draggablePoint is enabled).
  useEffect(() => {
    if (!ready || !mapRef.current || !draggablePoint || !onPointPlace) return;
    const map = mapRef.current;
    function handleClick(e: maplibregl.MapMouseEvent) {
      if (markerRef.current) return;
      onPointPlace!(e.lngLat.lng, e.lngLat.lat);
    }
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [ready, draggablePoint, onPointPlace]);

  // Render / update the geometry whenever it changes.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Always start fresh — remove old marker + layers.
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (map.getLayer('geom-fill'))   map.removeLayer('geom-fill');
    if (map.getLayer('geom-line'))   map.removeLayer('geom-line');
    if (map.getLayer('geom-point'))  map.removeLayer('geom-point');
    if (map.getSource('geom'))       map.removeSource('geom');

    if (!geom) {
      map.fitBounds(BHUTAN_BOUNDS, { padding: 24, duration: 0 });
      return;
    }

    if (geom.type === 'Point') {
      const [lon, lat] = geom.coordinates;
      const marker = new maplibregl.Marker({ color: '#304d3e', draggable: !!draggablePoint })
        .setLngLat([lon, lat])
        .addTo(map);
      if (draggablePoint && onPointChange) {
        marker.on('dragend', () => {
          const { lng, lat } = marker.getLngLat() as LngLat;
          onPointChange(lng, lat);
        });
      }
      markerRef.current = marker;
      map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 11), duration: 0 });
      return;
    }

    // Line + polygon: add a GeoJSON source + styled layers.
    map.addSource('geom', { type: 'geojson', data: { type: 'Feature', geometry: geom, properties: {} } });
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      map.addLayer({
        id: 'geom-fill', type: 'fill', source: 'geom',
        paint: { 'fill-color': '#304d3e', 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'geom-line', type: 'line', source: 'geom',
        paint: { 'line-color': '#304d3e', 'line-width': 2 },
      });
    } else {
      map.addLayer({
        id: 'geom-line', type: 'line', source: 'geom',
        paint: { 'line-color': '#304d3e', 'line-width': 3 },
      });
    }
    const bounds = bboxOfGeom(geom);
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 14 });
    }
  }, [geom, ready, draggablePoint, onPointChange]);

  // Render the optional `markers` array as DOM markers layered above the geom.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    // Clear old markers.
    extraMarkersRef.current.forEach(m => m.remove());
    extraMarkersRef.current = [];
    if (!markers || markers.length === 0) return;
    markers.forEach(m => {
      if (!Number.isFinite(m.lon) || !Number.isFinite(m.lat)) return;
      const size = m.size ?? 18;
      const el = document.createElement('div');
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '9999px';
      el.style.background = m.color;
      el.style.border = '2px solid #ffffff';
      el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#ffffff';
      el.style.fontWeight = '700';
      el.style.fontSize = `${Math.max(9, Math.floor(size * 0.55))}px`;
      el.style.fontFamily = 'Inter, system-ui, sans-serif';
      el.style.lineHeight = '1';
      el.style.cursor = m.onClick ? 'pointer' : 'default';
      if (m.icon) {
        // Inline-render the React node (typically a lucide icon) to SVG markup.
        el.innerHTML = renderToStaticMarkup(m.icon as React.ReactElement);
      } else if (m.label != null) {
        el.textContent = String(m.label);
      }
      if (m.title) el.title = m.title;
      if (m.onClick) el.addEventListener('click', (e) => { e.stopPropagation(); m.onClick!(); });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([m.lon, m.lat])
        .addTo(map);
      extraMarkersRef.current.push(marker);
    });
  }, [markers, ready]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    />
  );
}
