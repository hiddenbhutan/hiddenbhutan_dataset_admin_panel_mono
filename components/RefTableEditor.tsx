'use client';

/**
 * Inline editor for small `ref.*` lookup tables.
 *
 * Pattern: a flat table where every cell is an input; one column per row to add new
 * entries; per-row save/delete affordances. Each row tracks dirty state independently
 * — saves are a single POST per row. Rows in use by other tables cannot be deleted.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import {
  insertRefRow, updateRefRow, deleteRefRow,
  type RefTableKey, type RefActionResult,
} from '@/lib/actions/reference';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export type ColumnKind =
  | { kind: 'text';   width?: string; placeholder?: string }
  | { kind: 'int';    width?: string; min?: number; max?: number }
  | { kind: 'bool' }
  | { kind: 'enum';   options: Array<{ value: string; label: string }> };

export interface RefColumn {
  key: string;
  label: string;
  required?: boolean;
  type: ColumnKind;
}

export interface RefRow {
  id: number;
  usage_count: number;
}

type AnyRow = RefRow & { [k: string]: unknown };

interface Props<R extends RefRow> {
  tableKey: RefTableKey;
  title: string;
  description?: string;
  backHref?: string;
  rows: R[];
  columns: RefColumn[];
}

const displayLgStyle: React.CSSProperties = {
  fontSize: '32px', fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em',
};
const bodyMdStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 400, lineHeight: '20px' };
const bodySmStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 400, lineHeight: '18px' };
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

function emptyForColumns(columns: RefColumn[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columns) {
    if (c.type.kind === 'bool') out[c.key] = false;
    else if (c.type.kind === 'int') out[c.key] = null;
    else if (c.type.kind === 'enum') out[c.key] = c.type.options[0]?.value ?? '';
    else out[c.key] = '';
  }
  return out;
}

export default function RefTableEditor<R extends RefRow>({
  tableKey, title, description, backHref = '/reference', rows, columns,
}: Props<R>) {
  const [dirtyRows, setDirtyRows] = useState<Record<number, Record<string, unknown>>>({});
  const [newRow, setNewRow] = useState<Record<string, unknown>>(emptyForColumns(columns));
  const [pending, startTransition] = useTransition();

  function patchRow(id: number, key: string, value: unknown) {
    setDirtyRows(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [key]: value },
    }));
  }

  function discardRow(id: number) {
    setDirtyRows(prev => {
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
  }

  function saveRow(row: R) {
    const patch = dirtyRows[row.id];
    if (!patch) return;
    startTransition(async () => {
      const res: RefActionResult = await updateRefRow(tableKey, row.id, patch);
      if (res.ok) {
        toast.success('Saved');
        discardRow(row.id);
      } else if (res.errors) {
        toast.error(Object.values(res.errors)[0] ?? 'Validation failed');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function deleteRow(row: R) {
    if (row.usage_count > 0) {
      toast.error(`In use by ${row.usage_count} record${row.usage_count === 1 ? '' : 's'} — cannot delete.`);
      return;
    }
    const r = row as unknown as AnyRow;
    if (!confirm(`Delete "${r.label_en ?? r.code ?? r.id}"?`)) return;
    startTransition(async () => {
      const res = await deleteRefRow(tableKey, row.id);
      if (res.ok) toast.success('Deleted');
      else toast.error(res.message ?? 'Delete failed');
    });
  }

  function insertNew() {
    startTransition(async () => {
      const res = await insertRefRow(tableKey, newRow);
      if (res.ok) {
        toast.success('Added');
        setNewRow(emptyForColumns(columns));
      } else if (res.errors) {
        toast.error(Object.values(res.errors)[0] ?? 'Validation failed');
      } else {
        toast.error(res.message ?? 'Insert failed');
      }
    });
  }

  function renderCell(column: RefColumn, value: unknown, onChange: (v: unknown) => void) {
    if (column.type.kind === 'bool') {
      return (
        <Switch checked={!!value} onCheckedChange={onChange}
          className="data-[state=checked]:bg-on-primary-fixed-variant" />
      );
    }
    if (column.type.kind === 'int') {
      return (
        <Input type="number"
          min={column.type.min} max={column.type.max}
          value={value == null || value === '' ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="border-outline-variant h-8 text-sm font-mono" />
      );
    }
    if (column.type.kind === 'enum') {
      return (
        <select value={(value ?? '') as string}
          onChange={e => onChange(e.target.value)}
          className="w-full h-8 border border-outline-variant bg-surface-container-lowest rounded-md text-sm px-2">
          {column.type.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return (
      <Input
        value={(value ?? '') as string}
        onChange={e => onChange(e.target.value || null)}
        placeholder={column.type.placeholder}
        className={`border-outline-variant h-8 text-sm ${column.key === 'code' ? 'font-mono' : ''}`} />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href={backHref}
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Reference Editors
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-primary" style={displayLgStyle}>{title}</h1>
            {description && (
              <p className="text-on-surface-variant mt-1" style={bodyMdStyle}>{description}</p>
            )}
            <p className="font-mono text-outline mt-1" style={{ fontSize: '12px' }}>ref.{tableKey}</p>
          </div>
          <p className="text-on-surface-variant" style={bodySmStyle}>{rows.length} row{rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container-high">
              <tr>
                {columns.map(c => (
                  <th key={c.key} className="text-left px-3 py-2 text-on-primary-fixed-variant uppercase"
                      style={{ ...labelCapsStyle, minWidth: ('width' in c.type ? c.type.width : undefined) ?? '120px' }}>
                    {c.label}
                    {c.required && <span className="text-red-700 ml-0.5">*</span>}
                  </th>
                ))}
                <th className="text-left px-3 py-2 text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>In use</th>
                <th className="text-right px-3 py-2" style={{ width: '140px' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rows.map(row => {
                const patched = dirtyRows[row.id];
                const isDirty = !!patched;
                const anyRow = row as unknown as AnyRow;
                const getValue = (k: string) =>
                  patched && k in patched ? patched[k] : anyRow[k];
                return (
                  <tr key={row.id} className={isDirty ? 'bg-tertiary-fixed/30' : 'hover:bg-surface-container'}>
                    {columns.map(c => (
                      <td key={c.key} className="px-2 py-1.5 align-middle">
                        {renderCell(c, getValue(c.key), v => patchRow(row.id, c.key, v))}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-on-surface-variant" style={bodySmStyle}>
                      {row.usage_count > 0 ? (
                        <span className="font-mono">{row.usage_count}</span>
                      ) : (
                        <span className="text-outline">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isDirty && (
                          <>
                            <button type="button" disabled={pending}
                              onClick={() => discardRow(row.id)}
                              className="h-8 px-2 border border-outline-variant rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center gap-1"
                              style={{ fontSize: '12px' }}>
                              <RotateCcw size={12} /> Reset
                            </button>
                            <button type="button" disabled={pending}
                              onClick={() => saveRow(row)}
                              className="h-8 px-2 rounded bg-on-primary-fixed-variant text-tertiary-fixed flex items-center gap-1"
                              style={{ fontSize: '12px' }}>
                              <Save size={12} /> Save
                            </button>
                          </>
                        )}
                        {!isDirty && (
                          <button type="button" disabled={pending || row.usage_count > 0}
                            onClick={() => deleteRow(row)}
                            className={`h-8 px-2 border rounded flex items-center gap-1 ${row.usage_count > 0 ? 'border-outline-variant text-outline cursor-not-allowed' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}
                            style={{ fontSize: '12px' }}
                            title={row.usage_count > 0 ? `In use by ${row.usage_count} record(s)` : 'Delete'}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-container">
                {columns.map(c => (
                  <td key={c.key} className="px-2 py-2 align-middle">
                    {renderCell(c, newRow[c.key], v => setNewRow(prev => ({ ...prev, [c.key]: v })))}
                  </td>
                ))}
                <td></td>
                <td className="px-2 py-2 text-right">
                  <button type="button" disabled={pending}
                    onClick={insertNew}
                    className="h-8 px-3 rounded bg-on-primary-fixed-variant text-tertiary-fixed flex items-center gap-1 ml-auto"
                    style={{ fontSize: '12px' }}>
                    <Plus size={12} /> Add
                  </button>
                </td>
              </tr>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-on-surface-variant" style={bodyMdStyle}>
                    No rows yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
