type ChipVariant =
  | 'LC' | 'NT' | 'VU' | 'EN' | 'CR'
  | 'Easy' | 'Moderate' | 'Hard'
  | 'Trek' | 'Hike'
  | 'Published' | 'Draft'
  | 'Super Admin' | 'Admin' | 'Editor' | 'Viewer'
  | 'created' | 'updated' | 'deleted';

const styles: Record<string, { bg: string; color: string }> = {
  LC: { bg: '#d1ead6', color: '#1a4d2a' },
  NT: { bg: '#d6e8f0', color: '#2c5a70' },
  VU: { bg: '#fdefd8', color: '#7a4a10' },
  EN: { bg: '#f8ddd4', color: '#6b2a14' },
  CR: { bg: '#ffdad6', color: '#93000a' },
  Easy: { bg: '#c9ead6', color: '#032014' },
  Moderate: { bg: '#fdefd8', color: '#7a4a10' },
  Hard: { bg: '#ffdad6', color: '#93000a' },
  Trek: { bg: '#dae69f', color: '#5d682e' },
  Hike: { bg: '#d6e8f0', color: '#2c5a70' },
  Published: { bg: '#c9ead6', color: '#032014' },
  Draft: { bg: '#e8e2d7', color: '#424844' },
  'Super Admin': { bg: '#ffdea3', color: '#261900' },
  Admin: { bg: '#c9ead6', color: '#032014' },
  Editor: { bg: '#d6e8f0', color: '#2c5a70' },
  Viewer: { bg: '#e8e2d7', color: '#424844' },
  created: { bg: '#c9ead6', color: '#032014' },
  updated: { bg: '#d6e8f0', color: '#2c5a70' },
  deleted: { bg: '#ffdad6', color: '#93000a' },
};

export default function StatusChip({ label }: { label: ChipVariant | string }) {
  const s = styles[label] ?? { bg: '#e8e2d7', color: '#424844' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px', lineHeight: '16px' }}
    >
      {label}
    </span>
  );
}
