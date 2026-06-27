'use client';

/**
 * Map canvas for the POI Browser. Renders many points via a single GeoJSON
 * source + circle layer (much faster than DOM markers at scale). Per-category
 * colors match the design spec legend; the selected POI gets a contrasting
 * outline ring.
 *
 * Click a circle → onSelect(poi). Click empty space → onSelect(null).
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { LngLatBounds, type Map, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface POIMapItem {
  category: string;
  ref_id: number;
  name: string;
  name_dz?: string | null;
  subtype?: string | null;
  district?: string | null;
  lon: number;
  lat: number;
}

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

/** Category → marker fill color, matching the legend in the design spec. */
export const POI_COLORS: Record<string, string> = {
  heritage_site: '#ab8122',   // on-tertiary-container (Heritage / Dzong)
  dzong:         '#ab8122',
  locality:      '#59632a',   // secondary (Village / Waypoint)
  waypoint:      '#59632a',
  health_center: '#ba1a1a',   // error (Health / Emergency)
  school:        '#304d3e',   // on-primary-fixed-variant (Schools – greenish for educational)
};

const DEFAULT_COLOR = '#727973';

interface Props {
  items: POIMapItem[];
  selected: POIMapItem | null;
  onSelect: (poi: POIMapItem | null) => void;
}

export default function POIMap({ items, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const selectedMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Refs so click handlers don't capture stale items / onSelect from first render.
  const itemsRef = useRef<POIMapItem[]>(items);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Init once.
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
      selectedMarkerRef.current = null;
    };
  }, []);

  // Update the POI source whenever items change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    const features = items
      .filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat))
      .map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] as [number, number] },
        properties: {
          category: p.category,
          ref_id: p.ref_id,
          name: p.name,
        },
      }));

    const geojson = { type: 'FeatureCollection' as const, features };

    const existing = map.getSource('pois') as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
      return;
    }

    map.addSource('pois', { type: 'geojson', data: geojson });

    // Build a Mapbox-style match expression: ['match', ['get','category'], 'heritage_site', '#…', …, DEFAULT].
    const matchExpr: maplibregl.ExpressionSpecification = [
      'match', ['get', 'category'],
      'heritage_site', POI_COLORS.heritage_site,
      'dzong',         POI_COLORS.dzong,
      'locality',      POI_COLORS.locality,
      'waypoint',      POI_COLORS.waypoint,
      'health_center', POI_COLORS.health_center,
      'school',        POI_COLORS.school,
      DEFAULT_COLOR,
    ];

    map.addLayer({
      id: 'poi-fill',
      type: 'circle',
      source: 'pois',
      paint: {
        'circle-radius': 6,
        'circle-color': matchExpr,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });

    map.on('mouseenter', 'poi-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'poi-fill', () => { map.getCanvas().style.cursor = ''; });

    map.on('click', 'poi-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties as { category?: string; ref_id?: number; name?: string };
      // Look up the full item from the latest items ref (so filter changes don't go stale).
      const fullItem = itemsRef.current.find(
        it => it.category === props.category && it.ref_id === props.ref_id,
      ) ?? null;
      onSelectRef.current(fullItem);
    });
    map.on('click', (e) => {
      // Empty-space click — query if any feature is under the cursor; if not, deselect.
      const features = map.queryRenderedFeatures(e.point, { layers: ['poi-fill'] });
      if (features.length === 0) onSelectRef.current(null);
    });
  }, [items, ready]);

  // Selected POI: draw a halo marker so it pops above the dense circle layer.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
    if (selected && Number.isFinite(selected.lon) && Number.isFinite(selected.lat)) {
      const el = document.createElement('div');
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '9999px';
      el.style.border = `3px solid ${POI_COLORS[selected.category] ?? DEFAULT_COLOR}`;
      el.style.background = 'rgba(255,255,255,0.9)';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([selected.lon, selected.lat])
        .addTo(map);
      selectedMarkerRef.current = marker;
      map.flyTo({ center: [selected.lon, selected.lat], zoom: Math.max(map.getZoom(), 10), duration: 800 });
    }
  }, [selected, ready]);

  // Fit bounds to the loaded items on the first render with data.
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!ready || !mapRef.current || fittedRef.current || items.length === 0) return;
    const bounds = new LngLatBounds();
    items.forEach(p => {
      if (Number.isFinite(p.lon) && Number.isFinite(p.lat)) bounds.extend([p.lon, p.lat] as [number, number]);
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 9 });
      fittedRef.current = true;
    }
  }, [items, ready]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
