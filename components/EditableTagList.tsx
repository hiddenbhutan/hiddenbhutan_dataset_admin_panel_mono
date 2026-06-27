'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';

interface Props {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  tagStyle?: 'default' | 'dark' | 'gold';
}

const tagStyles = {
  default: { bg: '#f3ede2', color: '#424844', border: '#c2c8c2' },
  dark: { bg: '#082619', color: '#ffdea3', border: '#304d3e' },
  gold: { bg: '#ffdea3', color: '#261900', border: '#c79a3a' },
};

export default function EditableTagList({
  items,
  onChange,
  placeholder = 'Add item…',
  maxItems,
  tagStyle = 'default',
}: Props) {
  const [inputVal, setInputVal] = useState('');
  const ts = tagStyles[tagStyle];

  function add() {
    const v = inputVal.trim();
    if (!v) return;
    if (maxItems && items.length >= maxItems) return;
    if (!items.includes(v)) onChange([...items, v]);
    setInputVal('');
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium"
            style={{ backgroundColor: ts.bg, color: ts.color, borderColor: ts.border }}
          >
            {item}
            <button
              onClick={() => remove(i)}
              className="hover:opacity-60 transition-opacity ml-0.5"
              style={{ color: ts.color }}
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="h-8 border-[#c2c8c2] text-sm"
          style={{ fontSize: '13px' }}
          disabled={!!maxItems && items.length >= maxItems}
        />
        <button
          onClick={add}
          className="flex items-center gap-1 px-3 py-1 rounded border text-xs font-semibold transition-colors hover:opacity-80"
          style={{ backgroundColor: '#304d3e', color: '#ffdea3', borderColor: '#304d3e' }}
          disabled={!!maxItems && items.length >= maxItems}
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}
