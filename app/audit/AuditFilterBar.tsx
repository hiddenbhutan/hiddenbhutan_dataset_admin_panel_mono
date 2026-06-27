'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

const ACTION_OPTS: Array<{ value: 'all' | 'created' | 'updated'; label: string }> = [
  { value: 'all',     label: 'All' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
];

export default function AuditFilterBar({
  entityTypes,
  users,
  initial,
}: {
  entityTypes: Array<{ value: string; label: string }>;
  users: Array<{ id: number; label: string }>;
  initial: {
    entity: string;
    actor: string;
    action: 'all' | 'created' | 'updated';
    since: string;
    until: string;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  function push(next: typeof state) {
    setState(next);
    const params = new URLSearchParams();
    if (next.entity !== 'all') params.set('entity', next.entity);
    if (next.actor  !== 'all') params.set('actor', next.actor);
    if (next.action !== 'all') params.set('action', next.action);
    if (next.since)            params.set('since', next.since);
    if (next.until)            params.set('until', next.until);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/audit?${qs}` : '/audit');
    });
  }

  function clearAll() {
    push({ entity: 'all', actor: 'all', action: 'all', since: '', until: '' });
  }

  const hasFilters = state.entity !== 'all' || state.actor !== 'all' || state.action !== 'all' || state.since || state.until;

  return (
    <Card className="p-4 border-[#c2c8c2] bg-[#f9f3e8]">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex border border-[#c2c8c2] rounded-lg overflow-hidden bg-white">
          {ACTION_OPTS.map(o => (
            <button key={o.value}
              onClick={() => push({ ...state, action: o.value })}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: state.action === o.value ? '#304d3e' : 'white',
                color: state.action === o.value ? '#ffdea3' : '#424844',
                fontSize: '13px', fontWeight: 600,
              }}>
              {o.label}
            </button>
          ))}
        </div>

        <Select value={state.entity} onValueChange={v => { if (v) push({ ...state, entity: v }); }}>
          <SelectTrigger className="w-48 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Entity type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {entityTypes.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.actor} onValueChange={v => { if (v) push({ ...state, actor: v }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="User" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div>
          <label className="text-[#727973] uppercase tracking-wider block mb-1" style={{ fontSize: '10px', fontWeight: 700 }}>Since</label>
          <Input type="date" value={state.since}
            onChange={e => push({ ...state, since: e.target.value })}
            className="h-9 w-36 border-[#c2c8c2] bg-white text-sm" />
        </div>
        <div>
          <label className="text-[#727973] uppercase tracking-wider block mb-1" style={{ fontSize: '10px', fontWeight: 700 }}>Until</label>
          <Input type="date" value={state.until}
            onChange={e => push({ ...state, until: e.target.value })}
            className="h-9 w-36 border-[#c2c8c2] bg-white text-sm" />
        </div>

        {hasFilters && (
          <button onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#c2c8c2] bg-white hover:bg-[#ede8dd] transition-colors h-9"
            style={{ fontSize: '12px', color: '#424844', fontWeight: 600 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </Card>
  );
}
