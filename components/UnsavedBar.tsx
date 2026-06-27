'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
}

export default function UnsavedBar({ dirty, onSave, onDiscard, saving }: Props) {
  if (!dirty) return null;
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-full shadow-2xl z-50 border"
      style={{ backgroundColor: '#fff8e8', borderColor: '#c79a3a' }}
    >
      <div className="flex items-center gap-2" style={{ color: '#7a4a10' }}>
        <AlertCircle size={14} />
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Unsaved changes</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="h-7 text-xs"
          style={{ color: '#424844' }}
        >
          Discard
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="h-7 text-xs"
          style={{ backgroundColor: '#304d3e', color: '#ffdea3', border: 'none' }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
