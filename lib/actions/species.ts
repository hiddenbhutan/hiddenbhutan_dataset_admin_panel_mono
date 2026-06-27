'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  toBool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const KINGDOM_VALUES = ['animalia', 'plantae', 'fungi', 'chromista', 'protozoa', 'bacteria', 'archaea'] as const;
const NATIONAL_ROLE_VALUES = ['national_animal', 'national_bird', 'national_flower', 'national_tree'] as const;
const ABUNDANCE_VALUES = ['abundant', 'common', 'uncommon', 'rare', 'vagrant', 'extirpated', 'unknown'] as const;

const FIELDS: Record<string, FieldDef> = {
  slug:                       { column: 'slug' },
  scientific_name:            { column: 'scientific_name' },
  scientific_name_full:       { column: 'scientific_name_full' },
  authorship:                 { column: 'authorship' },
  kingdom:                    { column: 'kingdom', cast: 'content.species_kingdom' },
  phylum:                     { column: 'phylum' },
  class:                      { column: 'class' },
  // `order` is a SQL reserved word; quote in the SET clause.
  order:                      { column: '"order"' },
  family:                     { column: 'family' },
  genus:                      { column: 'genus' },
  taxon_rank:                 { column: 'taxon_rank' },
  gbif_taxon_key:             { column: 'gbif_taxon_key', transform: toIntOrNull },
  gbif_usage_key:             { column: 'gbif_usage_key', transform: toIntOrNull },
  common_name_en:             { column: 'common_name_en' },
  common_name_dz:             { column: 'common_name_dz' },
  conservation_status_iucn_id:   { column: 'conservation_status_iucn_id',   transform: toIntOrNull },
  conservation_status_bhutan_id: { column: 'conservation_status_bhutan_id', transform: toIntOrNull },
  is_endemic_to_bhutan:       { column: 'is_endemic_to_bhutan',   transform: toBool },
  is_endemic_to_himalaya:     { column: 'is_endemic_to_himalaya', transform: toBool },
  national_role:              { column: 'national_role', cast: 'content.national_species_role' },
  bhutan_abundance:           { column: 'bhutan_abundance', cast: 'content.species_abundance' },
  short_summary:              { column: 'short_summary' },
  bhutan_notes:               { column: 'bhutan_notes' },
  plumage_or_appearance:      { column: 'plumage_or_appearance' },
  vocal_notes:                { column: 'vocal_notes' },
  habitat:                    { column: 'habitat' },
  diet:                       { column: 'diet' },
  behavior:                   { column: 'behavior' },
  folklore:                   { column: 'folklore' },
  wikipedia_url:              { column: 'wikipedia_url' },
  wikipedia_summary:          { column: 'wikipedia_summary' },
  thumbnail_url:              { column: 'thumbnail_url' },
  is_curated:                 { column: 'is_curated', transform: toBool },
};

const Schema = z.object({
  slug:                       z.string().max(200)
                                .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                                .optional().nullable(),
  scientific_name:            z.string().min(1, 'Scientific name is required').max(200).optional(),
  scientific_name_full:       z.string().max(300).optional().nullable(),
  authorship:                 z.string().max(200).optional().nullable(),
  kingdom:                    z.enum(KINGDOM_VALUES).optional(),
  phylum:                     z.string().max(120).optional().nullable(),
  class:                      z.string().max(120).optional().nullable(),
  order:                      z.string().max(120).optional().nullable(),
  family:                     z.string().max(120).optional().nullable(),
  genus:                      z.string().max(120).optional().nullable(),
  taxon_rank:                 z.string().max(40).optional(),
  gbif_taxon_key:             z.union([z.number().int().min(0), z.null(), z.undefined(), z.literal('')]).optional(),
  gbif_usage_key:             z.union([z.number().int().min(0), z.null(), z.undefined(), z.literal('')]).optional(),
  common_name_en:             z.string().max(200).optional().nullable(),
  common_name_dz:             z.string().max(200).optional().nullable(),
  conservation_status_iucn_id:   z.union([z.number().int(), z.null(), z.literal('')]).optional(),
  conservation_status_bhutan_id: z.union([z.number().int(), z.null(), z.literal('')]).optional(),
  is_endemic_to_bhutan:       z.union([z.boolean(), z.number(), z.string()]).optional(),
  is_endemic_to_himalaya:     z.union([z.boolean(), z.number(), z.string()]).optional(),
  national_role:              z.enum(NATIONAL_ROLE_VALUES).optional().nullable(),
  bhutan_abundance:           z.enum(ABUNDANCE_VALUES).optional(),
  short_summary:              z.string().max(2000).optional().nullable(),
  bhutan_notes:               z.string().max(20_000).optional().nullable(),
  plumage_or_appearance:      z.string().max(20_000).optional().nullable(),
  vocal_notes:                z.string().max(20_000).optional().nullable(),
  habitat:                    z.string().max(20_000).optional().nullable(),
  diet:                       z.string().max(20_000).optional().nullable(),
  behavior:                   z.string().max(20_000).optional().nullable(),
  folklore:                   z.string().max(20_000).optional().nullable(),
  wikipedia_url:              z.string().url('Must be a URL').max(500).optional().nullable(),
  wikipedia_summary:          z.string().max(40_000).optional().nullable(),
  thumbnail_url:              z.string().url('Must be a URL').max(500).optional().nullable(),
  is_curated:                 z.union([z.boolean(), z.number(), z.string()]).optional(),
}).strip();

export async function updateSpecies(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'species',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/species', `/species/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setSpeciesStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'species',
    id,
    newStatus,
    revalidate: ['/species', `/species/${id}`],
    expectedUpdatedAt,
  });
}

export async function createSpecies(): Promise<InsertResult> {
  // scientific_name is UNIQUE — timestamp suffix avoids collisions on rapid creates.
  const placeholder = `Untitled sp. ${Date.now()}`;
  return insertDraft({
    schema: 'content',
    table: 'species',
    seed: {
      scientific_name: { value: placeholder },
      kingdom: { value: 'animalia', cast: 'content.species_kingdom' },
      taxon_rank: { value: 'species' },
    },
    revalidate: ['/species'],
  });
}

export async function deleteSpecies(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'species',
    id,
    revalidate: ['/species'],
  });
}
