'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { HealthCenterType, HealthCenterStatus } from '@/lib/db';
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

const TYPE_OPTS: { value: HealthCenterType; label: string }[] = [
  { value: 'orc',                        label: 'ORC' },
  { value: 'sub_post',                   label: 'Sub-post' },
  { value: 'bhu_2',                      label: 'BHU II' },
  { value: 'bhu_1',                      label: 'BHU I' },
  { value: 'phc',                        label: 'PHC' },
  { value: 'district_hospital',          label: 'District hospital' },
  { value: 'regional_referral_hospital', label: 'Regional referral' },
  { value: 'national_referral_hospital', label: 'National referral' },
  { value: 'other',                      label: 'Other' },
];

const OSTATUS_OPTS: { value: HealthCenterStatus; label: string }[] = [
  { value: 'operational',        label: 'Operational' },
  { value: 'temporarily_closed', label: 'Temporarily closed' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'permanently_closed', label: 'Permanently closed' },
  { value: 'unknown',            label: 'Unknown' },
];

export default function HealthCentersFilterBar({
  districts,
  initial,
}: {
  districts: string[];
  initial: {
    district: string;
    type: HealthCenterType | 'all';
    ostatus: HealthCenterStatus | 'all';
    status: 'all' | 'draft' | 'in_review' | 'published' | 'archived';
    helipad: boolean;
    fourwd: boolean;
    q: string;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  function push(next: typeof state) {
    setState(next);
    const params = new URLSearchParams();
    if (next.district !== 'all') params.set('district', next.district);
    if (next.type     !== 'all') params.set('type', next.type);
    if (next.ostatus  !== 'all') params.set('ostatus', next.ostatus);
    if (next.status   !== 'all') params.set('status', next.status);
    if (next.helipad)            params.set('helipad', '1');
    if (next.fourwd)             params.set('fourwd', '1');
    if (next.q)                  params.set('q', next.q);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/health-centers?${qs}` : '/health-centers');
    });
  }

  function clearAll() {
    push({ district: 'all', type: 'all', ostatus: 'all', status: 'all', helipad: false, fourwd: false, q: '' });
  }

  const hasFilters = state.district !== 'all' || state.type !== 'all' || state.ostatus !== 'all' || state.status !== 'all' || state.helipad || state.fourwd || state.q;

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
                fontSize: '13px', fontWeight: 600,
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <Select value={state.type} onValueChange={v => { if (v) push({ ...state, type: v as HealthCenterType | 'all' }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.ostatus} onValueChange={v => { if (v) push({ ...state, ostatus: v as HealthCenterStatus | 'all' }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue placeholder="Op. status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All op. statuses</SelectItem>
            {OSTATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={state.district} onValueChange={v => { if (v) push({ ...state, district: v }); }}>
          <SelectTrigger className="w-44 h-9 border-[#c2c8c2] bg-white text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
        <div className="flex items-center gap-2">
          <Switch checked={state.helipad} onCheckedChange={v => push({ ...state, helipad: v })} className="data-[state=checked]:bg-[#304d3e]" />
          <span className="text-[#424844]" style={{ fontSize: '13px' }}>Helipad only</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={state.fourwd} onCheckedChange={v => push({ ...state, fourwd: v })} className="data-[state=checked]:bg-[#304d3e]" />
          <span className="text-[#424844]" style={{ fontSize: '13px' }}>Requires 4WD</span>
        </div>
      </div>
    </Card>
  );
}
