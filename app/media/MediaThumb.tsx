import { Image as ImageIcon, Music, Video, Globe2, Box } from 'lucide-react';
import type { MediaItem } from '@/lib/db';

const ICON_BY_KIND: Record<MediaItem['kind'], React.ElementType> = {
  image:        ImageIcon,
  video:        Video,
  audio:        Music,
  panorama_360: Globe2,
  model_3d:     Box,
};

const BG_BY_KIND: Record<MediaItem['kind'], string> = {
  image:        '#dae69f',
  video:        '#d6e8f0',
  audio:        '#fdefd8',
  panorama_360: '#e6dff0',
  model_3d:     '#f3ede2',
};

/**
 * Renders the actual cdn_url image when available, otherwise a kind-keyed
 * placeholder. Plain <img> rather than next/image so any cdn_url host works
 * without next.config.ts allowlisting.
 */
export default function MediaThumb({ item }: { item: MediaItem }) {
  if (item.kind === 'image' && item.cdn_url) {
    return (
      <img
        src={item.cdn_url}
        alt={item.alt_text ?? ''}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  const Icon = ICON_BY_KIND[item.kind];
  const bg = BG_BY_KIND[item.kind];
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: bg }}>
      <Icon size={28} className="text-[#727973] opacity-70" />
    </div>
  );
}
