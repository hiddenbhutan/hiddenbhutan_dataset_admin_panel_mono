'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

const STATUS_PILLS: Array<{ value: 'all' | 'draft' | 'in_review' | 'published' | 'archived'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
];

export default function WaypointsFilterBar({
  categories,
  districts,
  initial,
}: {
  categories: string[];
  districts: string[];
  initial: {
    category: string;
    district: string;
    status: 'all' | 'draft' | 'in_review' | 'published' | 'archived';
    q: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  function push(next: typeof state) {
    setState(next);
    const params = new URLSearchParams();
    if (next.category !== 'all') params.set('category', next.category);
    if (next.district !== 'all') params.set('district', next.district);
    if (next.status !== 'all')   params.set('status', next.status);
    if (next.q)                  params.set('q', next.q);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/waypoints?${qs}` : '/waypoints');
    });
  }

  function clearAll() {
    push({ category: 'all', district: 'all', status: 'all', q: '' });
  }

  const hasFilters = state.category !== 'all' || state.district !== 'all' || state.status !== 'all' || state.q;

  return (
    <Card className="p-4 border-[#c2c8c2] bg-[#f9f3e8]">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex border border-[#c2c8c2] rounded-lg overflow-hidden bg-white">
          {STATUS_PILLS.map(p => (
            <button key={p.value}
              onClick={() => push({ ...state, status: p.value })}
              disabled={pending}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: state.status === p.value ? '#304d3e' : 'white',
                color: state.status === p.value ? '#ffdea3' : '#424844',
                fontSize: '13px',
                fontWeight: 600,
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Category */}
        <Select value={state.category} onValueChange={v => { if (v) push({ ...state, category: v }); }}>
          <SelectTrigger className="w-40 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* District */}
        <Select value={state.district} onValueChange={v => { if (v) push({ ...state, district: v }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#424844]" size={14} />
          <Input
            value={state.q}
            onChange={e => setState({ ...state, q: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') push(state); }}
            onBlur={() => { if (state.q !== initial.q) push(state); }}
            placeholder="Search name…"
            className="pl-9 h-9 w-56 border-[#c2c8c2] bg-white text-sm"
          />
        </div>

        {hasFilters && (
          <button onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#c2c8c2] bg-white hover:bg-[#ede8dd] transition-colors"
            style={{ fontSize: '12px', color: '#424844', fontWeight: 600 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </Card>
  );
}
