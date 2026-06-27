'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, X } from 'lucide-react';

const STATUS_PILLS: Array<{ value: 'all' | 'draft' | 'in_review' | 'published' | 'archived'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
];

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all',        label: 'All kinds' },
  { value: 'village',    label: 'Villages' },
  { value: 'hamlet',     label: 'Hamlets' },
  { value: 'settlement', label: 'Settlements' },
  { value: 'town',       label: 'Towns' },
  { value: 'thromde',    label: 'Thromdes' },
];

export default function VillagesFilterBar({
  districts,
  initial,
}: {
  districts: string[];
  initial: {
    district: string;
    kind: string;
    status: 'all' | 'draft' | 'in_review' | 'published' | 'archived';
    q: string;
    acc: boolean;
    food: boolean;
    phone: boolean;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  function push(next: typeof state) {
    setState(next);
    const params = new URLSearchParams();
    if (next.district !== 'all') params.set('district', next.district);
    if (next.kind     !== 'all') params.set('kind', next.kind);
    if (next.status   !== 'all') params.set('status', next.status);
    if (next.acc)                params.set('acc', '1');
    if (next.food)               params.set('food', '1');
    if (next.phone)              params.set('phone', '1');
    if (next.q)                  params.set('q', next.q);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/villages?${qs}` : '/villages');
    });
  }

  function clearAll() {
    push({ district: 'all', kind: 'all', status: 'all', q: '', acc: false, food: false, phone: false });
  }

  const hasFilters = state.district !== 'all' || state.kind !== 'all' || state.status !== 'all' || state.q || state.acc || state.food || state.phone;

  return (
    <Card className="p-4 border-[#c2c8c2] bg-[#f9f3e8] space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-[#c2c8c2] rounded-lg overflow-hidden bg-white">
          {STATUS_PILLS.map(p => (
            <button key={p.value}
              onClick={() => push({ ...state, status: p.value })}
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

        <Select value={state.district} onValueChange={v => { if (v) push({ ...state, district: v }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.kind} onValueChange={v => { if (v) push({ ...state, kind: v }); }}>
          <SelectTrigger className="w-40 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>

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

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#e8e2d7]">
        {[
          { label: 'Accommodation', key: 'acc' as const },
          { label: 'Food supply',   key: 'food' as const },
          { label: 'Phone signal',  key: 'phone' as const },
        ].map(({ label, key }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch checked={state[key]} onCheckedChange={v => push({ ...state, [key]: v })} className="data-[state=checked]:bg-[#304d3e]" />
            <span className="text-[#424844]" style={{ fontSize: '13px' }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
