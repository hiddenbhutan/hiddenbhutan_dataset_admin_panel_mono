'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

export default function ChiwogsFilterBar({
  dzongkhags,
  gewogs,
  initial,
}: {
  dzongkhags: string[];
  gewogs: string[];
  initial: { dz: string; gewog: string; q: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  function push(next: typeof state) {
    setState(next);
    const params = new URLSearchParams();
    if (next.dz    !== 'all') params.set('dz', next.dz);
    if (next.gewog !== 'all') params.set('gewog', next.gewog);
    if (next.q)               params.set('q', next.q);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/districts?${qs}#chiwog` : '/districts#chiwog');
    });
  }

  function clearAll() {
    push({ dz: 'all', gewog: 'all', q: '' });
  }

  const hasFilters = state.dz !== 'all' || state.gewog !== 'all' || state.q;

  return (
    <Card className="p-4 border-[#c2c8c2] bg-[#f9f3e8]">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={state.dz} onValueChange={v => { if (v) push({ ...state, dz: v }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Dzongkhag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dzongkhags</SelectItem>
            {dzongkhags.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.gewog} onValueChange={v => { if (v) push({ ...state, gewog: v }); }}>
          <SelectTrigger className="w-48 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Gewog" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All gewogs</SelectItem>
            {gewogs.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#424844]" size={14} />
          <Input
            value={state.q}
            onChange={e => setState({ ...state, q: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') push(state); }}
            onBlur={() => { if (state.q !== initial.q) push(state); }}
            placeholder="Name or NSB code…"
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
