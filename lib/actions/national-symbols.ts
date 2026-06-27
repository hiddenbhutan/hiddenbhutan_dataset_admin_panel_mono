'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const KIND_VALUES = [
  'animal', 'bird', 'flower', 'tree', 'sport',
  'dress_male', 'dress_female', 'game', 'anthem',
  'flag', 'emblem', 'currency', 'day', 'other',
] as const;

const FIELDS: Record<string, FieldDef> = {
  kind:           { column: 'kind', cast: 'content.national_symbol_kind' },
  name_en:        { column: 'name_en' },
  name_dz:        { column: 'name_dz' },
  name_romanized: { column: 'name_romanized' },
  description:    { column: 'description' },
  significance:   { column: 'significance' },
  folklore:       { column: 'folklore' },
  history:        { column: 'history' },
  species_id:     { column: 'species_id', transform: toIntOrNull },
  figure_id:      { column: 'figure_id',  transform: toIntOrNull },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  kind:           z.enum(KIND_VALUES).optional(),
  name_en:        z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  description:    z.string().max(20_000).optional().nullable(),
  significance:   z.string().max(20_000).optional().nullable(),
  folklore:       z.string().max(20_000).optional().nullable(),
  history:        z.string().max(20_000).optional().nullable(),
  species_id:     refIdField,
  figure_id:      refIdField,
}).strip();

export async function updateNationalSymbol(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'national_symbol',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/national-symbols', `/national-symbols/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setNationalSymbolStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'national_symbol',
    id,
    newStatus,
    revalidate: ['/national-symbols', `/national-symbols/${id}`],
    expectedUpdatedAt,
  });
}

export async function createNationalSymbol(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'national_symbol',
    seed: {
      name_en: { value: `Untitled symbol ${Date.now()}` },
      kind: { value: 'other', cast: 'content.national_symbol_kind' },
    },
    revalidate: ['/national-symbols'],
  });
}

export async function deleteNationalSymbol(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'national_symbol',
    id,
    revalidate: ['/national-symbols'],
  });
}
