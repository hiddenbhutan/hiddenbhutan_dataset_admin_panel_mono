'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { MediaItem, MediaLicense } from '@/lib/db';
import { updateMediaMetaAction } from '@/lib/actions/media';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LICENSE_OPTS: { value: MediaLicense; label: string }[] = [
  { value: 'all_rights_reserved',  label: 'All rights reserved' },
  { value: 'cc0',                  label: 'CC0' },
  { value: 'cc_by',                label: 'CC BY' },
  { value: 'cc_by_sa',             label: 'CC BY-SA' },
  { value: 'cc_by_nc',             label: 'CC BY-NC' },
  { value: 'cc_by_nc_sa',          label: 'CC BY-NC-SA' },
  { value: 'public_domain',        label: 'Public domain' },
  { value: 'used_with_permission', label: 'Used with permission' },
];

export default function MediaEditDialog({
  item,
  revalidatePaths,
  open,
  onOpenChange,
}: {
  item: MediaItem;
  revalidatePaths: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    alt_text: item.alt_text ?? '',
    caption: item.caption ?? '',
    photographer: item.photographer ?? '',
    license: item.license,
    license_notes: item.license_notes ?? '',
  });

  function save() {
    startTransition(async () => {
      const res = await updateMediaMetaAction(item.id, form, revalidatePaths, item.updated_at ?? undefined);
      if (res.ok) {
        toast.success('Saved');
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit media</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#727973]">Alt text</Label>
            <Input value={form.alt_text} onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))} placeholder="Short description for accessibility" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#727973]">Caption</Label>
            <Textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#727973]">Photographer</Label>
            <Input value={form.photographer} onChange={e => setForm(f => ({ ...f, photographer: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#727973]">License</Label>
            <Select value={form.license} onValueChange={v => v && setForm(f => ({ ...f, license: v as MediaLicense }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LICENSE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#727973]">License notes / attribution</Label>
            <Textarea value={form.license_notes} onChange={e => setForm(f => ({ ...f, license_notes: e.target.value }))} rows={2}
              placeholder="Source URL, credit line, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
