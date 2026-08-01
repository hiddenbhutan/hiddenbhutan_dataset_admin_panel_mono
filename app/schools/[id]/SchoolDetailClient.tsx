'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Home } from 'lucide-react';
import { toast } from 'sonner';

import type { SchoolFull, RefOption, RefSchoolCategory, MediaItem } from '@/lib/db';
import {
  updateSchool, setSchoolStatus, deleteSchool,
} from '@/lib/actions/schools';
import PointGeomEditor from '@/components/map/PointGeomEditor';
import EntityMediaPanel from '@/components/media/EntityMediaPanel';
import type { GeomGeoJSON } from '@/components/map/MapView';
import {
  StatusBadge, StatusActions, DiscardSaveButtons, DeleteButton, FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';


function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-on-primary-fixed-variant mb-1.5 block uppercase" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-outline" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-outline-variant mb-4">
      <p className="font-bold uppercase text-on-primary-fixed-variant" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>{title}</p>
    </div>
  );
}

export default function SchoolDetailClient({
  school, districts, categories, initialGeom, media,
}: { school: SchoolFull; districts: RefOption[]; categories: RefSchoolCategory[]; initialGeom: GeomGeoJSON | null; media: MediaItem[] }) {
  const categoryLabel = (id: number | null) =>
    id == null ? null : categories.find(c => c.id === id)?.label_en ?? null;
  const [data, setData] = useState({ ...school });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(school.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(school.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof SchoolFull>(key: K, value: SchoolFull[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    setDirty(true);
  }, []);

  function handleSave() {
    const patch = {
      name:             data.name,
      category_id:      data.category_id,
      description:      data.description,
      remarks:          data.remarks,
      elevation_m:      data.elevation_m,
      dzongkhag_id:     data.dzongkhag_id,
      students_female:  data.students_female,
      students_male:    data.students_male,
      students_total:   data.students_total,
      capacity:         data.capacity,
      has_hostel:       data.has_hostel,
    };
    startTransition(async () => {
      const res = await updateSchool(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.name}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        toast.error(res.message ?? 'Please fix the highlighted fields');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setSchoolStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <Link href="/schools"
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors"
          style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> Schools
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase bg-tertiary-fixed text-on-tertiary-fixed" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                <GraduationCap size={11} /> {categoryLabel(data.category_id) ?? 'School'}
              </span>
              {data.has_hostel ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded uppercase bg-surface-container-high text-on-surface-variant" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <Home size={11} /> Hostel
                </span>
              ) : null}
              <span className="font-mono text-outline border border-outline-variant px-2 py-0.5 rounded" style={{ fontSize: '12px' }}>SCH-{data.id}</span>
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>{data.name}</h1>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons dirty={dirty} pending={pending}
              onDiscard={() => { setData({ ...school }); setDirty(false); }}
              onSave={handleSave} />
            <DeleteButton onDelete={() => deleteSchool(data.id)}
              redirectTo="/schools" entityLabel={data.name} />
          </div>
        </div>
      </div>

      <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
        <CardContent className="p-5">
          <S title="Location" />
          <PointGeomEditor entity="school" id={data.id} initial={initialGeom} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-5">
              <div>
                <S title="Identity" />
                <div className="space-y-3">
                  <F label="Name">
                    <Input value={data.name} onChange={e => update('name', e.target.value)}
                      className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.name} />
                  </F>
                  <F label="Description">
                    <Textarea value={data.description ?? ''} onChange={e => update('description', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Remarks">
                    <Textarea value={data.remarks ?? ''} onChange={e => update('remarks', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Enrollment" />
                <div className="grid grid-cols-4 gap-3">
                  <F label="Total students">
                    <Input type="number" value={data.students_total ?? ''}
                      onChange={e => update('students_total', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Male">
                    <Input type="number" value={data.students_male ?? ''}
                      onChange={e => update('students_male', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Female">
                    <Input type="number" value={data.students_female ?? ''}
                      onChange={e => update('students_female', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="Capacity">
                    <Input type="number" value={data.capacity ?? ''}
                      onChange={e => update('capacity', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Classification" />
              <F label="Category">
                <Select value={data.category_id != null ? String(data.category_id) : '__none'}
                  onValueChange={(v) => update('category_id', v === '__none' ? null : Number(v))}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— None —</SelectItem>
                    {categories.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.full_form ?? o.label_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <div className="flex items-center justify-between">
                <Label className="text-on-surface-variant" style={{ fontSize: '12px' }}>Has hostel</Label>
                <Switch checked={!!data.has_hostel}
                  onCheckedChange={v => update('has_hostel', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <S title="Location" />
              <div className="grid grid-cols-2 gap-3">
                <F label="Longitude">
                  <Input type="number" step="0.0001" value={data.lon ?? ''}
                    readOnly className="border-outline-variant h-9 text-sm font-mono bg-surface-container" />
                </F>
                <F label="Latitude">
                  <Input type="number" step="0.0001" value={data.lat ?? ''}
                    readOnly className="border-outline-variant h-9 text-sm font-mono bg-surface-container" />
                </F>
              </div>
              <F label="Elevation (m)">
                <Input type="number" value={data.elevation_m ?? ''}
                  onChange={e => update('elevation_m', e.target.value ? Number(e.target.value) : null)}
                  className="border-outline-variant h-9 text-sm font-mono" />
              </F>
              <F label="Dzongkhag">
                <Select value={data.dzongkhag_id ? String(data.dzongkhag_id) : '__none'}
                  onValueChange={(v) => update('dzongkhag_id', v === '__none' ? null : Number(v))}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {districts.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
            </CardContent>
          </Card>

          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityMediaPanel
                entityType="school"
                entityId={school.id}
                items={media}
                revalidatePaths={[`/schools/${school.id}`, '/media']}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
