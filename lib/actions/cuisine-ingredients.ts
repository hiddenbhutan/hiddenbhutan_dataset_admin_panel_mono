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


const FIELDS: Record<string, FieldDef> = {
  name:           { column: 'name_en' },
  name_dz:        { column: 'name_dz' },
  name_romanized: { column: 'name_romanized' },
  slug:           { column: 'slug' },
  description:    { column: 'description' },
  notes:          { column: 'notes' },
  species_id:     { column: 'species_id',  transform: toIntOrNull },
  is_local:       { column: 'is_local',    transform: toBool },
  is_seasonal:    { column: 'is_seasonal', transform: toBool },
  season_months:  { column: 'season_months' },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name:           z.string().min(1, 'Name is required').max(200).optional(),
  name_dz:        z.string().max(200).optional().nullable(),
  name_romanized: z.string().max(200).optional().nullable(),
  slug:           z.string().max(200)
                    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                    .optional().nullable(),
  description:    z.string().max(20_000).optional().nullable(),
  notes:          z.string().max(20_000).optional().nullable(),
  species_id:     refIdField,
  is_local:       z.union([z.boolean(), z.number(), z.string()]).optional(),
  is_seasonal:    z.union([z.boolean(), z.number(), z.string()]).optional(),
  season_months:  z.string().max(200).optional().nullable(),
}).strip();

export async function updateCuisineIngredient(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'cuisine_ingredient',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/cuisine-ingredients', `/cuisine-ingredients/${id}`, '/food'],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setCuisineIngredientStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'cuisine_ingredient',
    id,
    newStatus,
    revalidate: ['/cuisine-ingredients', `/cuisine-ingredients/${id}`, '/food'],
    expectedUpdatedAt,
  });
}

export async function createCuisineIngredient(): Promise<InsertResult> {
  // name_en is UNIQUE so use a timestamp suffix to avoid collisions on rapid clicks.
  return insertDraft({
    schema: 'content',
    table: 'cuisine_ingredient',
    seed: { name_en: { value: `Untitled ingredient ${Date.now()}` } },
    revalidate: ['/cuisine-ingredients'],
  });
}

export async function deleteCuisineIngredient(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'cuisine_ingredient',
    id,
    revalidate: ['/cuisine-ingredients', '/food'],
  });
}
