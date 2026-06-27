/**
 * Resolve a waypoint icon name (ref.waypoint_type.icon, kebab-case) to a lucide-react
 * component. Some icons in our seed don't exist in this lucide version; we map them
 * to the nearest visual equivalent so the markers always render something meaningful.
 */

import {
  Tent, Sofa, Split, ShieldCheck, Droplet, Waves, CloudRain, ThermometerSun,
  MountainSnow, Mountain, CircleDot, Gem, ShoppingBag, BedDouble, Bath, CircleParking,
  SquareStack, Flag, Home, Castle, Trees, Flower, Bird, PawPrint, Umbrella,
  Helicopter, Signal, MapPin, Eye, Waypoints, type LucideIcon,
} from 'lucide-react';

/** Aliases for seed icon names that don't exist as-is in lucide-react. */
const ALIASES: Record<string, LucideIcon> = {
  // flag-{start,end} aren't separate icons in lucide; reuse Flag.
  'flag-start':   Flag,
  'flag-end':     Flag,
  // No Bridge in this lucide version — Waypoints is the closest visual.
  'bridge':       Waypoints,
  // No `wave` — the catalog also has plural `waves`. Both map to Waves.
  'wave':         Waves,
  // No MountainEye — Eye over a peak makes sense for a viewpoint.
  'mountain-eye': Eye,
};

const DIRECT: Record<string, LucideIcon> = {
  'tent':            Tent,
  'sofa':            Sofa,
  'split':           Split,
  'shield-check':    ShieldCheck,
  'droplet':         Droplet,
  'waves':           Waves,
  'cloud-rain':      CloudRain,
  'thermometer-sun': ThermometerSun,
  'mountain-snow':   MountainSnow,
  'mountain':        Mountain,
  'circle-dot':      CircleDot,
  'gem':             Gem,
  'shopping-bag':    ShoppingBag,
  'bed-double':      BedDouble,
  'bath':            Bath,
  'circle-parking':  CircleParking,
  'square-stack':    SquareStack,
  'flag':            Flag,
  'home':            Home,
  'castle':          Castle,
  'trees':           Trees,
  'flower':          Flower,
  'bird':            Bird,
  'paw-print':       PawPrint,
  'umbrella':        Umbrella,
  'helicopter':      Helicopter,
  'signal':          Signal,
};

/** Map a kebab-case icon name to a lucide-react component, with sensible fallbacks. */
export function waypointIcon(name: string | null | undefined): LucideIcon {
  if (!name) return MapPin;
  return ALIASES[name] ?? DIRECT[name] ?? MapPin;
}
