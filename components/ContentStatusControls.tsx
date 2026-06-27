'use client';

/**
 * Shared status-workflow controls + badge for any content entity.
 * Drop-in for detail pages: pass the current status and a transition callback.
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Eye, EyeOff, FileText, Globe, Trash2 } from 'lucide-react';

export type ContentStatus = 'draft' | 'in_review' | 'published' | 'archived';

const STATUS_STYLE: Record<ContentStatus, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#e8e2d7', color: '#424844', label: 'Draft' },
  in_review: { bg: '#fdefd8', color: '#7a4a10', label: 'In review' },
  published: { bg: '#c9ead6', color: '#1a4d2a', label: 'Published' },
  archived:  { bg: '#e8d6d6', color: '#7a1a1a', label: 'Archived' },
};

const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-block rounded-full uppercase"
      style={{ ...labelCapsStyle, padding: '4px 12px', backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function StatusActions({
  status,
  onTransition,
  pending,
}: {
  status: ContentStatus;
  onTransition: (next: ContentStatus) => void;
  pending: boolean;
}) {
  if (status === 'draft') {
    return (
      <Button onClick={() => onTransition('in_review')} disabled={pending}
        variant="outline" className="border border-on-tertiary-fixed-variant text-on-tertiary-fixed-variant bg-surface-container hover:bg-surface-container-high">
        <Eye size={14} className="mr-2" /> Submit for review
      </Button>
    );
  }
  if (status === 'in_review') {
    return (
      <>
        <Button onClick={() => onTransition('draft')} disabled={pending}
          variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high">
          Back to draft
        </Button>
        <Button onClick={() => onTransition('published')} disabled={pending}
          className="bg-on-primary-fixed text-tertiary-fixed border-none hover:opacity-90">
          <CheckCircle2 size={14} className="mr-2" /> Publish
        </Button>
      </>
    );
  }
  if (status === 'published') {
    return (
      <Button onClick={() => onTransition('in_review')} disabled={pending}
        variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high">
        <EyeOff size={14} className="mr-2" /> Unpublish
      </Button>
    );
  }
  if (status === 'archived') {
    return (
      <Button onClick={() => onTransition('draft')} disabled={pending}
        variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high">
        Restore to draft
      </Button>
    );
  }
  return null;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="mt-1.5 text-on-error-container font-medium"
      style={{ fontSize: '11px' }}
      role="alert"
    >
      {message}
    </p>
  );
}

export function DeleteButton({
  onDelete,
  redirectTo,
  entityLabel = 'this record',
  disabled = false,
}: {
  /** Server action. Must return `{ ok: boolean; message?: string; inUse?: boolean }`. */
  onDelete: () => Promise<{ ok: boolean; message?: string; inUse?: boolean }>;
  /** Path to navigate to on success. */
  redirectTo: string;
  /** Quoted in the confirm prompt — e.g. "this festival", "Paro Tshechu". */
  entityLabel?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete ${entityLabel}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await onDelete();
      if (res.ok) {
        toast.success('Deleted');
        router.push(redirectTo);
        router.refresh();
      } else {
        toast.error(res.message ?? 'Delete failed');
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={handleClick}
      className="border border-outline-variant bg-surface-container text-on-error-container hover:bg-error-container">
      <Trash2 size={14} className="mr-2" /> {pending ? 'Deleting…' : 'Delete'}
    </Button>
  );
}

export function DiscardSaveButtons({
  dirty,
  pending,
  onDiscard,
  onSave,
}: {
  dirty: boolean;
  pending: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <Button variant="outline" className="border border-outline-variant bg-surface-container hover:bg-surface-container-high" disabled={!dirty || pending}
        onClick={onDiscard}>
        <FileText size={14} className="mr-2" /> Discard
      </Button>
      <Button onClick={onSave} disabled={!dirty || pending}
        className="bg-primary-container text-tertiary-fixed border-none hover:opacity-90">
        <Globe size={14} className="mr-2" /> {pending ? 'Saving…' : 'Save'}
      </Button>
    </>
  );
}
