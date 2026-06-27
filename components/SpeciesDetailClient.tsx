'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Star, Globe, MapPin, Camera, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

import type {
  Species,
  SpeciesAlias,
  SpeciesAliasKind,
  SpeciesLocationRow,
  SpeciesOccurrenceRow,
  SpeciesSightingPoint,
  IucnStatus,
  NationalSpeciesRole,
  SpeciesAbundance,
  SpeciesKingdom,
  RefConservationStatus,
} from '@/lib/db';
import { updateSpecies, setSpeciesStatus, deleteSpecies } from '@/lib/actions/species';
import SightingsMap from '@/components/map/SightingsMap';
import {
  StatusBadge,
  StatusActions,
  DiscardSaveButtons,
  DeleteButton,
  FieldError,
  type ContentStatus,
} from '@/components/ContentStatusControls';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const IUCN_COLOR: Record<IucnStatus, { bg: string; color: string }> = {
  EX: { bg: '#52001a', color: '#fff' },
  EW: { bg: '#7a1a2a', color: '#fff' },
  CR: { bg: '#ffdad6', color: '#93000a' },
  EN: { bg: '#f8ddd4', color: '#6b2a14' },
  VU: { bg: '#fdefd8', color: '#7a4a10' },
  NT: { bg: '#d6e8f0', color: '#2c5a70' },
  LC: { bg: '#c9ead6', color: '#032014' },
  DD: { bg: '#e8e2d7', color: '#424844' },
  NE: { bg: '#ede8dd', color: '#727973' },
};

// Sighting dates carry day precision with a meaningless midnight time; render in
// UTC so the date never shifts, honouring observed_date_precision.
function fmtSightingDate(iso: string | null, precision: string | null): string {
  if (!iso) return 'Undated';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Undated';
  if (precision === 'year')  return String(d.getUTCFullYear());
  if (precision === 'month') return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const KINGDOM_OPTS: { value: SpeciesKingdom; label: string }[] = [
  { value: 'animalia',  label: 'Animalia' },
  { value: 'plantae',   label: 'Plantae' },
  { value: 'fungi',     label: 'Fungi' },
  { value: 'chromista', label: 'Chromista' },
  { value: 'protozoa',  label: 'Protozoa' },
  { value: 'bacteria',  label: 'Bacteria' },
  { value: 'archaea',   label: 'Archaea' },
];

const NATIONAL_ROLE_OPTS: { value: NationalSpeciesRole; label: string }[] = [
  { value: 'national_animal', label: 'National animal' },
  { value: 'national_bird',   label: 'National bird' },
  { value: 'national_flower', label: 'National flower' },
  { value: 'national_tree',   label: 'National tree' },
];

const ABUNDANCE_OPTS: { value: SpeciesAbundance; label: string }[] = [
  { value: 'abundant',   label: 'Abundant' },
  { value: 'common',     label: 'Common' },
  { value: 'uncommon',   label: 'Uncommon' },
  { value: 'rare',       label: 'Rare' },
  { value: 'vagrant',    label: 'Vagrant' },
  { value: 'extirpated', label: 'Extirpated' },
  { value: 'unknown',    label: 'Unknown' },
];

const ALIAS_KIND_LABEL: Record<SpeciesAliasKind, string> = {
  synonym:              'Synonym',
  vernacular_en:        'English vernacular',
  vernacular_dz:        'Dzongkha vernacular',
  vernacular_romanized: 'Romanized vernacular',
  vernacular_local:    'Local / dialect',
  misspelling:          'Common misspelling',
};

const LOCATION_KIND_LABEL: Record<string, string> = {
  conservation_area: 'Conservation area',
  trek_route:        'Trek route',
  locality:          'Locality',
  dzongkhag:         'Dzongkhag',
};

const LOCATION_KIND_HREF: Record<string, string> = {
  conservation_area: '/conservation',
  trek_route:        '/routes',
  locality:          '/villages',
  dzongkhag:         '/districts',
};

const ABUNDANCE_BADGE: Record<SpeciesAbundance, { bg: string; color: string }> = {
  abundant:   { bg: '#c9ead6', color: '#1a4d2a' },
  common:     { bg: '#dae69f', color: '#5d682e' },
  uncommon:   { bg: '#fdefd8', color: '#7a4a10' },
  rare:       { bg: '#ffe0c0', color: '#8a3a00' },
  vagrant:    { bg: '#e6dff0', color: '#4a3370' },
  extirpated: { bg: '#ffdad6', color: '#93000a' },
  unknown:    { bg: '#e8e2d7', color: '#727973' },
};

const CONFIDENCE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  confirmed:    { bg: '#c9ead6', color: '#1a4d2a', label: 'Confirmed' },
  probable:     { bg: '#fdefd8', color: '#7a4a10', label: 'Probable' },
  possible:     { bg: '#e8e2d7', color: '#424844', label: 'Possible' },
  unconfirmed:  { bg: '#ffdad6', color: '#93000a', label: 'Unconfirmed' },
};

// Typography helpers — design spec
const labelCapsStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', lineHeight: '16px',
};

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-on-surface-variant mb-1.5 block uppercase" style={labelCapsStyle}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-outline" style={{ fontSize: '11px' }}>{hint}</p>}
    </div>
  );
}
function S({ title }: { title: string }) {
  return (
    <div className="pb-3 border-b border-outline-variant mb-4">
      <p className="text-on-primary-fixed-variant uppercase" style={labelCapsStyle}>{title}</p>
    </div>
  );
}

export default function SpeciesDetailClient({
  species,
  aliases,
  locations,
  occurrences,
  sightingPoints,
  conservationStatuses,
  backHref,
  backLabel,
  /** Show bird-specific narrative fields (vocal_notes, plumage). Default: infer from class='Aves'. */
  showBirdFields,
}: {
  species: Species;
  aliases: SpeciesAlias[];
  locations: SpeciesLocationRow[];
  occurrences: SpeciesOccurrenceRow[];
  sightingPoints: SpeciesSightingPoint[];
  conservationStatuses: RefConservationStatus[];
  backHref: string;
  backLabel: string;
  showBirdFields?: boolean;
}) {
  const isBird = showBirdFields ?? (species.class === 'Aves');

  const [data, setData] = useState({ ...species });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(species.content_status);
  const [updatedAt, setUpdatedAt] = useState<string | null>(species.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const update = useCallback(<K extends keyof Species>(key: K, value: Species[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    setDirty(true);
  }, []);

  // Conservation status edits the FK id; keep the matching code in sync so the
  // status badge (keyed by code) updates live without a reload.
  const setConservation = useCallback(
    (scale: 'iucn' | 'bhutan', id: number) => {
      const code = (conservationStatuses.find(c => c.id === id)?.label_en ?? 'NE') as IucnStatus;
      setData(prev => ({
        ...prev,
        [`conservation_status_${scale}_id`]: id,
        [`conservation_status_${scale}`]: code,
      }));
      setDirty(true);
    },
    [conservationStatuses],
  );

  function handleSave() {
    const patch = {
      slug:                       data.slug,
      scientific_name:            data.scientific_name,
      scientific_name_full:       data.scientific_name_full,
      authorship:                 data.authorship,
      kingdom:                    data.kingdom,
      phylum:                     data.phylum,
      class:                      data.class,
      order:                      data.order,
      family:                     data.family,
      genus:                      data.genus,
      taxon_rank:                 data.taxon_rank,
      gbif_taxon_key:             data.gbif_taxon_key,
      gbif_usage_key:             data.gbif_usage_key,
      common_name_en:             data.common_name_en,
      common_name_dz:             data.common_name_dz,
      conservation_status_iucn_id:   data.conservation_status_iucn_id,
      conservation_status_bhutan_id: data.conservation_status_bhutan_id,
      is_endemic_to_bhutan:       data.is_endemic_to_bhutan,
      is_endemic_to_himalaya:     data.is_endemic_to_himalaya,
      national_role:              data.national_role,
      bhutan_abundance:           data.bhutan_abundance,
      short_summary:              data.short_summary,
      bhutan_notes:               data.bhutan_notes,
      plumage_or_appearance:      data.plumage_or_appearance,
      vocal_notes:                data.vocal_notes,
      habitat:                    data.habitat,
      diet:                       data.diet,
      behavior:                   data.behavior,
      folklore:                   data.folklore,
      wikipedia_url:              data.wikipedia_url,
      wikipedia_summary:          data.wikipedia_summary,
      thumbnail_url:              data.thumbnail_url,
      is_curated:                 data.is_curated,
    };
    startTransition(async () => {
      const res = await updateSpecies(data.id, patch, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(`Saved · ${data.common_name_en ?? data.scientific_name}`);
        setDirty(false);
        setErrors({});
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else if (res.errors) {
        setErrors(res.errors);
        toast.error(res.message ?? 'Please fix the highlighted fields');
      } else if (res.conflict) {
        toast.error(res.message ?? 'Reload — someone else edited this row');
      } else {
        toast.error(res.message ?? 'Save failed');
      }
    });
  }

  function transition(next: ContentStatus) {
    startTransition(async () => {
      const res = await setSpeciesStatus(data.id, next, updatedAt ?? undefined);
      if (res.ok) {
        toast.success(res.message ?? `Status: ${next}`);
        if (res.contentStatus) setStatus(res.contentStatus);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } else {
        toast.error(res.message ?? 'Status change failed');
      }
    });
  }

  const iucnColor = IUCN_COLOR[data.conservation_status_iucn];
  const btColor = IUCN_COLOR[data.conservation_status_bhutan];
  const aliasesByKind = aliases.reduce<Record<string, SpeciesAlias[]>>((acc, a) => {
    (acc[a.kind] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <Link href={backHref} className="flex items-center gap-1 text-on-surface-variant hover:text-on-primary-fixed-variant mb-3 transition-colors" style={{ fontSize: '13px' }}>
          <ArrowLeft size={14} /> {backLabel}
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: iucnColor.bg, color: iucnColor.color, fontSize: '10px' }} title="Global IUCN">
                IUCN {data.conservation_status_iucn}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: btColor.bg, color: btColor.color, fontSize: '10px' }} title="Bhutan IUCN">
                BT {data.conservation_status_bhutan}
              </span>
              {data.national_role && (
                <span className="flex items-center gap-1 text-on-tertiary-container font-semibold" style={{ fontSize: '12px' }}>
                  <Crown size={13} /> {NATIONAL_ROLE_OPTS.find(r => r.value === data.national_role)?.label}
                </span>
              )}
              {data.is_endemic_to_bhutan ? (
                <span className="flex items-center gap-1 text-on-secondary-container font-semibold" style={{ fontSize: '12px' }}>
                  <Star size={13} /> Endemic to Bhutan
                </span>
              ) : null}
              {data.is_endemic_to_himalaya ? (
                <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#e6dff0', color: '#4a3370', fontSize: '10px' }}>Endemic to Himalaya</span>
              ) : null}
              {!data.is_curated && (
                <span className="px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#ede8dd', color: '#727973', fontSize: '10px' }} title="GBIF checklist only — not part of the curated UX surface">GBIF</span>
              )}
              <span className="font-mono text-outline text-sm border border-outline-variant px-2 py-0.5 rounded">SP-{data.id}</span>
              {data.slug && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>/{data.slug}</span>}
            </div>
            <h1 className="font-bold text-on-surface" style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
              {data.common_name_en ?? data.scientific_name}
            </h1>
            <p className="italic text-outline mt-0.5" style={{ fontSize: '14px' }}>
              {data.scientific_name_full ?? data.scientific_name}
              {data.family && <span className="not-italic ml-2 text-on-surface-variant">· {data.family}</span>}
              {data.common_name_dz && <span className="not-italic ml-2 text-on-surface-variant">· {data.common_name_dz}</span>}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <StatusBadge status={status} />
            <StatusActions status={status} pending={pending} onTransition={transition} />
            <DiscardSaveButtons
              dirty={dirty}
              pending={pending}
              onDiscard={() => { setData({ ...species }); setDirty(false); }}
              onSave={handleSave}
            />
            <DeleteButton onDelete={() => deleteSpecies(data.id)}
              redirectTo={backHref} entityLabel={data.scientific_name} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 space-y-4">
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Identity &amp; taxonomy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <S title="Names" />
                <div className="space-y-3">
                  <F label="Scientific name (binomial)">
                    <Input value={data.scientific_name} onChange={e => update('scientific_name', e.target.value)}
                      className="border-outline-variant h-9 text-sm italic" />
                    <FieldError message={errors.scientific_name} />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Scientific name (with authority)">
                      <Input value={data.scientific_name_full ?? ''} onChange={e => update('scientific_name_full', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm italic" />
                    </F>
                    <F label="Authorship">
                      <Input value={data.authorship ?? ''} onChange={e => update('authorship', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" placeholder="e.g. (Linnaeus, 1758)" />
                    </F>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Common name (English)">
                      <Input value={data.common_name_en ?? ''} onChange={e => update('common_name_en', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                    <F label="Common name (Dzongkha)">
                      <Input value={data.common_name_dz ?? ''} onChange={e => update('common_name_dz', e.target.value || null)}
                        className="border-outline-variant h-9 text-sm" />
                    </F>
                  </div>
                  <F label="Slug" hint="URL identifier (lowercase, dashes).">
                    <Input value={data.slug ?? ''} onChange={e => update('slug', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                    <FieldError message={errors.slug} />
                  </F>
                </div>
              </div>

              <div>
                <S title="Taxonomy" />
                <div className="grid grid-cols-3 gap-3">
                  <F label="Kingdom">
                    <Select value={data.kingdom} onValueChange={v => { if (v) update('kingdom', v as SpeciesKingdom); }}>
                      <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KINGDOM_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                  <F label="Phylum">
                    <Input value={data.phylum ?? ''} onChange={e => update('phylum', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Class">
                    <Input value={data.class ?? ''} onChange={e => update('class', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" placeholder="e.g. Aves, Mammalia" />
                  </F>
                  <F label="Order">
                    <Input value={data.order ?? ''} onChange={e => update('order', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Family">
                    <Input value={data.family ?? ''} onChange={e => update('family', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Genus">
                    <Input value={data.genus ?? ''} onChange={e => update('genus', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                  </F>
                  <F label="Taxon rank" hint="species | subspecies | variety | form">
                    <Input value={data.taxon_rank} onChange={e => update('taxon_rank', e.target.value)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="GBIF taxon key">
                    <Input type="number" value={data.gbif_taxon_key ?? ''} onChange={e => update('gbif_taxon_key', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                  <F label="GBIF usage key">
                    <Input type="number" value={data.gbif_usage_key ?? ''} onChange={e => update('gbif_usage_key', e.target.value ? Number(e.target.value) : null)}
                      className="border-outline-variant h-9 text-sm font-mono" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Narrative" />
                <div className="space-y-3">
                  <F label="Short summary" hint="One-paragraph blurb for cards.">
                    <Textarea value={data.short_summary ?? ''} onChange={e => update('short_summary', e.target.value || null)}
                      rows={2} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <F label="Bhutan notes" hint="App-facing description.">
                    <Textarea value={data.bhutan_notes ?? ''} onChange={e => update('bhutan_notes', e.target.value || null)}
                      rows={4} className="border-outline-variant text-sm resize-none" />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Habitat">
                      <Textarea value={data.habitat ?? ''} onChange={e => update('habitat', e.target.value || null)}
                        rows={3} className="border-outline-variant text-sm resize-none" />
                    </F>
                    <F label="Diet">
                      <Textarea value={data.diet ?? ''} onChange={e => update('diet', e.target.value || null)}
                        rows={3} className="border-outline-variant text-sm resize-none" />
                    </F>
                  </div>
                  <F label="Behavior">
                    <Textarea value={data.behavior ?? ''} onChange={e => update('behavior', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                  {isBird && (
                    <>
                      <F label="Plumage / appearance">
                        <Textarea value={data.plumage_or_appearance ?? ''} onChange={e => update('plumage_or_appearance', e.target.value || null)}
                          rows={3} className="border-outline-variant text-sm resize-none" />
                      </F>
                      <F label="Vocal notes">
                        <Textarea value={data.vocal_notes ?? ''} onChange={e => update('vocal_notes', e.target.value || null)}
                          rows={2} className="border-outline-variant text-sm resize-none" />
                      </F>
                    </>
                  )}
                  <F label="Folklore">
                    <Textarea value={data.folklore ?? ''} onChange={e => update('folklore', e.target.value || null)}
                      rows={3} className="border-outline-variant text-sm resize-none" />
                  </F>
                </div>
              </div>

              <div>
                <S title="Reference" />
                <div className="space-y-3">
                  <F label="Wikipedia URL">
                    <Input type="url" value={data.wikipedia_url ?? ''} onChange={e => update('wikipedia_url', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" placeholder="https://en.wikipedia.org/wiki/…" />
                    <FieldError message={errors.wikipedia_url} />
                  </F>
                  <F label="Thumbnail URL">
                    <Input type="url" value={data.thumbnail_url ?? ''} onChange={e => update('thumbnail_url', e.target.value || null)}
                      className="border-outline-variant h-9 text-sm" />
                    <FieldError message={errors.thumbnail_url} />
                  </F>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aliases */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '14px' }}>Aliases</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {aliases.length === 0 ? 'No aliases recorded' : `${aliases.length} alias${aliases.length === 1 ? '' : 'es'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {aliases.length === 0 ? (
                <EmptyRow message="Populate content.species_alias for synonyms and vernaculars." />
              ) : (
                <div className="divide-y divide-outline-variant">
                  {Object.entries(aliasesByKind).map(([kind, items]) => (
                    <div key={kind} className="px-4 py-3">
                      <p className="font-bold uppercase tracking-wider text-on-primary-fixed-variant mb-1" style={{ fontSize: '10px' }}>
                        {ALIAS_KIND_LABEL[kind as SpeciesAliasKind]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map(a => (
                          <span key={a.id} className="px-2 py-0.5 rounded border border-outline-variant text-on-surface" style={{ fontSize: '12px' }}
                            title={[a.region, a.notes].filter(Boolean).join(' · ')}>
                            {a.name}
                            {a.region && <span className="text-outline ml-1" style={{ fontSize: '10px' }}>({a.region})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-5 space-y-4">
          {/* Conservation + endemism */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '16px' }}>Conservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <F label="IUCN status (global)">
                <Select value={String(data.conservation_status_iucn_id)} onValueChange={v => { if (v) setConservation('iucn', Number(v)); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {conservationStatuses.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.full_form} ({o.label_en})</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="IUCN status (Bhutan)" hint="Bhutan-specific assessment using the same IUCN scale.">
                <Select value={String(data.conservation_status_bhutan_id)} onValueChange={v => { if (v) setConservation('bhutan', Number(v)); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {conservationStatuses.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.full_form} ({o.label_en})</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Bhutan abundance">
                <Select value={data.bhutan_abundance} onValueChange={v => { if (v) update('bhutan_abundance', v as SpeciesAbundance); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ABUNDANCE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="National role" hint="At most one species can hold each national role.">
                <Select value={data.national_role ?? '__none'} onValueChange={v => { if (v) update('national_role', v === '__none' ? null : v as NationalSpeciesRole); }}>
                  <SelectTrigger className="border-outline-variant h-9 text-sm"><SelectValue placeholder="Not a national symbol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Not a national symbol</SelectItem>
                    {NATIONAL_ROLE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-on-surface-variant">Endemic to Bhutan</Label>
                <Switch checked={!!data.is_endemic_to_bhutan} onCheckedChange={v => update('is_endemic_to_bhutan', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-on-surface-variant">Endemic to Himalaya</Label>
                <Switch checked={!!data.is_endemic_to_himalaya} onCheckedChange={v => update('is_endemic_to_himalaya', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-on-surface-variant">Curated</Label>
                <Switch checked={!!data.is_curated} onCheckedChange={v => update('is_curated', v ? 1 : 0)}
                  className="data-[state=checked]:bg-on-primary-fixed-variant" />
              </div>
            </CardContent>
          </Card>

          {/* Locations */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '14px' }}>Where found</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {locations.length === 0 ? 'No location links recorded' : `${locations.length} location${locations.length === 1 ? '' : 's'}`}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {locations.length === 0 ? (
                <EmptyRow message="Populate content.species_location (PA / route / locality / dzongkhag)." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {locations.map(loc => {
                    const ab = ABUNDANCE_BADGE[loc.abundance];
                    const href = `${LOCATION_KIND_HREF[loc.kind]}/${loc.target_id}`;
                    return (
                      <li key={loc.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded font-bold uppercase border border-outline-variant text-on-surface-variant" style={{ fontSize: '9px' }}>
                            {LOCATION_KIND_LABEL[loc.kind]}
                          </span>
                          <Link href={href} className="font-semibold text-on-primary-fixed-variant hover:underline" style={{ fontSize: '13px' }}>
                            {loc.name}
                          </Link>
                          <span className="px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: ab.bg, color: ab.color, fontSize: '9px' }}>
                            {loc.abundance}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-on-surface-variant flex-wrap" style={{ fontSize: '11px' }}>
                          {loc.best_months && <span>Best: {loc.best_months}</span>}
                          {loc.elevation_min_m != null && loc.elevation_max_m != null && (
                            <span className="font-mono">{loc.elevation_min_m.toLocaleString()}–{loc.elevation_max_m.toLocaleString()} m</span>
                          )}
                          {loc.source_dataset && <span className="text-outline">src: {loc.source_dataset}</span>}
                        </div>
                        {loc.notes && <p className="text-outline mt-1 italic" style={{ fontSize: '11px' }}>{loc.notes}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Occurrences */}
          <Card className="border border-outline-variant bg-surface-container-low rounded-xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-on-surface" style={{ fontSize: '14px' }}>Sightings</CardTitle>
              <p className="text-outline" style={{ fontSize: '12px' }}>
                {species.occurrence_count.toLocaleString()} total · {sightingPoints.length.toLocaleString()} mapped · {occurrences.length} listed
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {sightingPoints.length > 0 && (
                <div className="px-4 pb-3">
                  <SightingsMap points={sightingPoints} height="220px" />
                  <div className="flex items-center gap-3 mt-2 text-outline" style={{ fontSize: '10px' }}>
                    <Dot color="#1a7f4b" label="Confirmed" />
                    <Dot color="#304d3e" label="Probable" />
                    <Dot color="#b07a1e" label="Possible" />
                    <Dot color="#9aa39c" label="Unconfirmed" />
                  </div>
                </div>
              )}
              {occurrences.length === 0 ? (
                <EmptyRow message="Populate content.species_occurrence with GBIF / eBird / iNat / curated point sightings." />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {occurrences.map(o => {
                    const conf = CONFIDENCE_BADGE[o.confidence] ?? CONFIDENCE_BADGE.probable;
                    const hasCoord = o.lat != null && o.lon != null;
                    return (
                      <li key={o.id} className="px-4 py-3">
                        {/* Row 1: date + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-on-surface" style={{ fontSize: '12px' }}>
                            <CalendarDays size={12} className="text-outline" />
                            {fmtSightingDate(o.observed_at, o.observed_date_precision)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: conf.bg, color: conf.color, fontSize: '9px' }}>
                            {conf.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant uppercase" style={{ fontSize: '9px' }}>
                            {o.category}
                          </span>
                          {o.image_url && (
                            <span className="inline-flex items-center gap-1 text-outline" style={{ fontSize: '10px' }} title={`Photo: ${o.image_url}`}>
                              <Camera size={11} /> photo
                            </span>
                          )}
                        </div>

                        {/* Row 2: coordinates (the important bit) — full precision + map link */}
                        {hasCoord && (
                          <div className="flex items-center gap-3 mt-1.5">
                            <a
                              href={`https://www.google.com/maps?q=${o.lat},${o.lon}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-on-primary-fixed-variant hover:underline"
                              style={{ fontSize: '11px' }}
                              title="Open in Google Maps"
                            >
                              <MapPin size={11} />
                              {o.lat!.toFixed(5)}, {o.lon!.toFixed(5)}
                            </a>
                            {o.elevation_m != null && <span className="font-mono text-outline" style={{ fontSize: '11px' }}>{Math.round(o.elevation_m).toLocaleString()} m</span>}
                            {o.accuracy_m != null && <span className="font-mono text-outline" style={{ fontSize: '11px' }} title="Location accuracy">±{o.accuracy_m} m</span>}
                          </div>
                        )}

                        {/* Row 3: place + observer */}
                        {(o.notes || o.observer) && (
                          <div className="flex items-center gap-2 mt-1 text-outline" style={{ fontSize: '11px' }}>
                            {o.notes && <span className="text-on-surface-variant">{o.notes}</span>}
                            {o.notes && o.observer && <span>·</span>}
                            {o.observer && <span>obs. {o.observer}</span>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {data.wikipedia_url && (
            <a href={data.wikipedia_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-on-primary-fixed-variant hover:underline px-4 py-2" style={{ fontSize: '13px', fontWeight: 600 }}>
              <Globe size={14} /> Open on Wikipedia
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-6 text-center text-outline" style={{ fontSize: '12px' }}>
      {message}
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span style={{ width: 8, height: 8, borderRadius: 9999, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}
