'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toJsonbArray,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';


const CATEGORY_VALUES = [
  'greeting', 'dress', 'dining', 'religious', 'hospitality',
  'gift_giving', 'taboo', 'driglam_namzha', 'etiquette', 'other',
] as const;

const SEVERITY_VALUES = ['informational', 'advisable', 'important', 'critical'] as const;

const FIELDS: Record<string, FieldDef> = {
  slug:             { column: 'slug' },
  category:         { column: 'category', cast: 'content.cultural_custom_category' },
  title_en:         { column: 'title_en' },
  title_dz:         { column: 'title_dz' },
  description:      { column: 'description' },
  visitor_guidance: { column: 'visitor_guidance' },
  background:       { column: 'background' },
  severity:         { column: 'severity', cast: 'content.severity_level' },
  applies_in_contexts: { column: 'applies_in_contexts', cast: 'jsonb', transform: toJsonbArray },
};

const Schema = z.object({
  slug:             z.string().max(200)
                      .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, digits, and dashes only')
                      .optional().nullable(),
  category:         z.enum(CATEGORY_VALUES).optional(),
  title_en:         z.string().min(1, 'Title is required').max(300).optional(),
  title_dz:         z.string().max(300).optional().nullable(),
  description:      z.string().max(20_000).optional().nullable(),
  visitor_guidance: z.string().max(20_000).optional().nullable(),
  background:       z.string().max(20_000).optional().nullable(),
  severity:         z.enum(SEVERITY_VALUES).optional(),
  applies_in_contexts: z.string().max(10_000).optional().nullable(),
}).strip();

export async function updateCulturalCustom(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'cultural_custom',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/cultural-customs', `/cultural-customs/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setCulturalCustomStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'cultural_custom',
    id,
    newStatus,
    revalidate: ['/cultural-customs', `/cultural-customs/${id}`],
    expectedUpdatedAt,
  });
}

export async function createCulturalCustom(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'cultural_custom',
    seed: {
      name_en: { value: `Untitled custom ${Date.now()}` },
      category: { value: 'other', cast: 'content.cultural_custom_category' },
    },
    revalidate: ['/cultural-customs'],
  });
}

export async function deleteCulturalCustom(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'cultural_custom',
    id,
    revalidate: ['/cultural-customs'],
  });
}
