'use client';

/**
 * Small read-only map that plots every sighting of one species as points.
 *
 * Uses a single MapLibre GeoJSON source + circle layer (not DOM markers) so it
 * stays fast even for species with thousands of occurrences. Fits to the points'
 * bounds on load; falls back to the Bhutan extent when there are none.
 */

import { useEffect, useRef } from 'react';
import maplibregl, { LngLatBounds, type Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { SpeciesSightingPoint } from '@/lib/db';

const BHUTAN_BOUNDS: [[number, number], [number, number]] = [[88.5, 26.6], [92.3, 28.5]];

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

// Circle fill by observation confidence.
const CONFIDENCE_COLORS: Record<string, string> = {
  confirmed:   '#1a7f4b',
  probable:    '#304d3e',
  possible:    '#b07a1e',
  unconfirmed: '#9aa39c',
};

function fmtDate(iso: string | null, precision: string | null): string {
  if (!iso) return 'Undated';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Undated';
  if (precision === 'year')  return String(d.getUTCFullYear());
  if (precision === 'month') return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function popupHtml(p: Record<string, unknown>): string {
  const lon = Number(p.lon), lat = Number(p.lat);
  const rows: string[] = [];
  rows.push(`<div style="font-weight:700;font-size:12px;margin-bottom:2px">${esc(fmtDate((p.observed_at as string) ?? null, (p.observed_date_precision as string) ?? null))}</div>`);
  rows.push(`<div style="font-family:monospace;font-size:11px">${lat.toFixed(5)}, ${lon.toFixed(5)}</div>`);
  const meta: string[] = [];
  if (p.category) meta.push(esc(String(p.category)));
  if (p.confidence) meta.push(esc(String(p.confidence)));
  if (p.elevation_m != null && p.elevation_m !== '') meta.push(`${Math.round(Number(p.elevation_m)).toLocaleString()} m`);
  if (meta.length) rows.push(`<div style="font-size:11px;color:#5a635c;margin-top:2px">${meta.join(' · ')}</div>`);
  if (p.notes) rows.push(`<div style="font-size:11px;margin-top:2px">${esc(String(p.notes))}</div>`);
  const tail: string[] = [];
  if (p.observer) tail.push(`obs. ${esc(String(p.observer))}`);
  if (p.has_photo === true || p.has_photo === 'true') tail.push('📷 photo');
  if (tail.length) rows.push(`<div style="font-size:10px;color:#8a938c;margin-top:2px">${tail.join(' · ')}</div>`);
  return `<div style="min-width:140px">${rows.join('')}</div>`;
}

export default function SightingsMap({
  points,
  height = '240px',
}: {
  points: SpeciesSightingPoint[];
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const valid = points.filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat));
    const fc = {
      type: 'FeatureCollection' as const,
      features: valid.map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        properties: {
          lon: p.lon, lat: p.lat,
          confidence: p.confidence,
          category: p.category,
          observed_at: p.observed_at,
          observed_date_precision: p.observed_date_precision,
          observer: p.observer,
          elevation_m: p.elevation_m,
          notes: p.notes,
          has_photo: p.has_photo,
        },
      })),
    };

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
      map.addSource('sightings', { type: 'geojson', data: fc });
      map.addLayer({
        id: 'sightings-pts',
        type: 'circle',
        source: 'sightings',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 10, 5, 14, 7],
          'circle-color': [
            'match', ['get', 'confidence'],
            'confirmed', CONFIDENCE_COLORS.confirmed,
            'probable', CONFIDENCE_COLORS.probable,
            'possible', CONFIDENCE_COLORS.possible,
            'unconfirmed', CONFIDENCE_COLORS.unconfirmed,
            CONFIDENCE_COLORS.probable,
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click a dot → popup with its details.
      const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' });
      map.on('click', 'sightings-pts', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popup.setLngLat(coords).setHTML(popupHtml(f.properties as Record<string, unknown>)).addTo(map);
      });
      map.on('mouseenter', 'sightings-pts', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'sightings-pts', () => { map.getCanvas().style.cursor = ''; });

      if (valid.length > 0) {
        const b = new LngLatBounds();
        valid.forEach(p => b.extend([p.lon, p.lat]));
        map.fitBounds(b, { padding: 30, duration: 0, maxZoom: 12 });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [points]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: '12px', overflow: 'hidden' }}
    />
  );
}
