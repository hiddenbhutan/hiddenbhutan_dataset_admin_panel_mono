'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import type { MediaEntityType, MediaLicense } from '@/lib/db';
import { uploadMediaAction } from '@/lib/actions/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

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

const ENTITY_OPTS: { value: MediaEntityType; label: string }[] = [
  { value: 'trek_route',          label: 'Route' },
  { value: 'waypoint',            label: 'Waypoint' },
  { value: 'locality',            label: 'Locality' },
  { value: 'heritage_site',       label: 'Heritage site' },
  { value: 'dzong',               label: 'Dzong' },
  { value: 'dzong_lhakhang',      label: 'Lhakhang' },
  { value: 'health_center',       label: 'Health center' },
  { value: 'school',              label: 'School' },
  { value: 'conservation_area',   label: 'Conservation area' },
  { value: 'biological_corridor', label: 'Corridor' },
  { value: 'festival',            label: 'Festival' },
  { value: 'thangka',             label: 'Thangka' },
  { value: 'cuisine_item',        label: 'Cuisine item' },
  { value: 'cuisine_ingredient',  label: 'Ingredient' },
  { value: 'species',             label: 'Species' },
  { value: 'species_occurrence',  label: 'Sighting' },
  { value: 'historical_figure',   label: 'Historical figure' },
  { value: 'zorig_chusum',        label: 'Zorig Chusum' },
  { value: 'national_symbol',     label: 'National symbol' },
  { value: 'cultural_custom',     label: 'Cultural custom' },
  { value: 'traditional_game',    label: 'Traditional game' },
];

interface Props {
  /** When set, entity type/id are fixed (embedded on that entity's own detail page). */
  fixedEntityType?: MediaEntityType;
  fixedEntityId?: number;
  revalidatePaths: string[];
}

export default function MediaUploadForm({ fixedEntityType, fixedEntityId, revalidatePaths }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [entityType, setEntityType] = useState<MediaEntityType | ''>(fixedEntityType ?? '');
  const [entityId, setEntityId] = useState<string>(fixedEntityId ? String(fixedEntityId) : '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [photographer, setPhotographer] = useState('');
  const [license, setLicense] = useState<MediaLicense>('all_rights_reserved');
  const [licenseNotes, setLicenseNotes] = useState('');

  function handleFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function reset() {
    handleFile(null);
    setAltText(''); setCaption(''); setPhotographer(''); setLicenseNotes('');
    setLicense('all_rights_reserved');
    if (!fixedEntityType) setEntityType('');
    if (!fixedEntityId) setEntityId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function submit() {
    if (!entityType) { toast.error('Choose an entity type'); return; }
    const idNum = Number(entityId);
    if (!Number.isFinite(idNum) || idNum <= 0) { toast.error('Enter a valid entity id'); return; }
    if (!file) { toast.error('Choose an image file'); return; }

    const fd = new FormData();
    fd.set('entityType', entityType);
    fd.set('entityId', String(idNum));
    fd.set('file', file);
    fd.set('altText', altText);
    fd.set('caption', caption);
    fd.set('photographer', photographer);
    fd.set('license', license);
    fd.set('licenseNotes', licenseNotes);
    fd.set('revalidatePaths', revalidatePaths.join(','));

    startTransition(async () => {
      const res = await uploadMediaAction(fd);
      if (res.ok) {
        toast.success('Uploaded — saved as draft');
        reset();
        router.refresh();
      } else {
        toast.error(res.message ?? 'Upload failed');
      }
    });
  }

  return (
    <Card className="border-[#c2c8c2] bg-[#f9f3e8] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Upload size={16} className="text-[#424844]" />
        <p className="font-semibold text-[#1d1c15]" style={{ fontSize: '13px' }}>Upload image</p>
      </div>

      {!fixedEntityType && (
        <div className="grid grid-cols-2 gap-2">
          <Select value={entityType} onValueChange={v => v && setEntityType(v as MediaEntityType)}>
            <SelectTrigger className="h-9 bg-white text-sm"><SelectValue placeholder="Entity type" /></SelectTrigger>
            <SelectContent>
              {ENTITY_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            placeholder="Entity id (e.g. 58)"
            className="h-9 bg-white text-sm"
            inputMode="numeric"
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <label className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-[#c2c8c2] bg-white cursor-pointer hover:bg-[#f3ede2] transition-colors"
          style={{ fontSize: '13px', color: '#424844' }}>
          {file ? file.name : 'Choose an image…'}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)} />
        </label>
        {preview && (
          <div className="relative w-14 h-14 rounded overflow-hidden border border-[#c2c8c2] shrink-0">
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => handleFile(null)}
              className="absolute top-0 right-0 p-0.5 bg-black/60 text-white">
              <X size={10} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input value={altText} onChange={e => setAltText(e.target.value)} placeholder="Alt text" className="h-9 bg-white text-sm" />
        <Input value={photographer} onChange={e => setPhotographer(e.target.value)} placeholder="Photographer" className="h-9 bg-white text-sm" />
      </div>
      <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption" className="h-9 bg-white text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <Select value={license} onValueChange={v => v && setLicense(v as MediaLicense)}>
          <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LICENSE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={licenseNotes} onChange={e => setLicenseNotes(e.target.value)} placeholder="Source / attribution" className="h-9 bg-white text-sm" />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending || !file}>
          {pending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
    </Card>
  );
}
