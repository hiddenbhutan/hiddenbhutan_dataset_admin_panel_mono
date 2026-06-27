'use server';

import 'server-only';
import { z } from 'zod';
import {
  applyPatch,
  transitionStatus,
  insertDraft,
  deleteRecord,
  toIntOrNull,
  toFloatOrNull,
  toBool,
  type ActionResult,
  type ContentStatus,
  type FieldDef,
  type InsertResult,
  type DeleteResult,
} from './_shared';

const FIELDS: Record<string, FieldDef> = {
  name:             { column: 'name' },
  category_id:      { column: 'category_id', transform: toIntOrNull },
  description:      { column: 'description' },
  remarks:          { column: 'remarks' },
  elevation_m:      { column: 'elevation_m', transform: toFloatOrNull },
  dzongkhag_id:     { column: 'dzongkhag_id', transform: toIntOrNull },
  gewog_id:         { column: 'gewog_id',     transform: toIntOrNull },
  chiwog_id:        { column: 'chiwog_id',    transform: toIntOrNull },
  students_female:  { column: 'students_female', transform: toIntOrNull },
  students_male:    { column: 'students_male',   transform: toIntOrNull },
  students_total:   { column: 'students_total',  transform: toIntOrNull },
  capacity:         { column: 'capacity',        transform: toIntOrNull },
  has_hostel:       { column: 'has_hostel',      transform: toBool },
};

const refIdField = z.union([z.number().int().positive(), z.null(), z.undefined(), z.literal('')]).optional();
const countField = z.union([z.number().int().min(0).max(100_000), z.null(), z.undefined(), z.literal('')]).optional();

const Schema = z.object({
  name:             z.string().min(1, 'Name is required').max(300).optional(),
  category_id:      z.union([z.number().int(), z.null(), z.literal('')]).optional(),
  description:      z.string().max(20_000).optional().nullable(),
  remarks:          z.string().max(10_000).optional().nullable(),
  elevation_m:      z.union([z.number().min(-500).max(10_000), z.null(), z.undefined(), z.literal('')]).optional(),
  dzongkhag_id:     refIdField,
  gewog_id:         refIdField,
  chiwog_id:        refIdField,
  students_female:  countField,
  students_male:    countField,
  students_total:   countField,
  capacity:         countField,
  has_hostel:       z.union([z.boolean(), z.number(), z.string()]).optional(),
}).strip();

export async function updateSchool(
  id: number,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return applyPatch({
    schema: 'content',
    table: 'school',
    id,
    fields: FIELDS,
    patch,
    revalidate: ['/schools', `/schools/${id}`],
    expectedUpdatedAt,
    schemaValidator: Schema,
  });
}

export async function setSchoolStatus(
  id: number,
  newStatus: ContentStatus,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  return transitionStatus({
    schema: 'content',
    table: 'school',
    id,
    newStatus,
    revalidate: ['/schools', `/schools/${id}`],
    expectedUpdatedAt,
  });
}

export async function createSchool(): Promise<InsertResult> {
  return insertDraft({
    schema: 'content',
    table: 'school',
    seed: {
      name: { value: `Untitled school ${Date.now()}` },
      geom: { value: 'SRID=4326;POINT(89.6390 27.4716)', cast: 'geometry' },
    },
    revalidate: ['/schools'],
  });
}

export async function deleteSchool(id: number): Promise<DeleteResult> {
  return deleteRecord({
    schema: 'content',
    table: 'school',
    id,
    revalidate: ['/schools'],
  });
}
