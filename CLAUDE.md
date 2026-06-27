# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```sh
yarn dev        # Next.js dev server (http://localhost:3000)
yarn build      # Production build
```

No test suite. No lint script (run `tsc --noEmit` for type-checking).

**Required env vars** (copy from `.env.local`):
- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — at least 16 chars; signs the JWT session cookie
- `PG_SSL=true` — set when connecting to Supabase / any SSL-only host

## Architecture

### DB layer (`lib/db.ts`)

All reads go through `lib/db.ts` — a raw `pg` Pool, no ORM. The file exports typed interfaces and async getter functions for every entity. Two global conventions apply across all queries:

- `BOOLEAN` columns → `(col)::int` in SELECT so `0`/`1` reaches the UI (TypeScript types match)
- `BIGINT` (`int8`) columns → `Number()` via a process-global `types.setTypeParser(20, ...)` call at module top

Schema layout: `content.*` (all editable rows), `ref.*` (read-only lookups), `geo.*` (spatial), `admin.*` (auth users).

### Auth (`lib/auth.ts`, `lib/session.ts`)

HS256 JWT stored in an httpOnly `hb_session` cookie. Every server action and protected page calls `getCurrentAdminUser()` which verifies the cookie and fetches the `admin.users` row. Auth-required state throws `AuthRequired`; pages should redirect via middleware before reaching that point.

### Server actions (`lib/actions/`)

All mutations are Next.js Server Actions. The shared scaffold is in `lib/actions/_shared.ts`, which exposes four primitives:

| Function | Purpose |
|---|---|
| `applyPatch(opts)` | Whitelisted field UPDATE with optional Zod validation + optimistic lock |
| `transitionStatus(opts)` | Content status state machine (draft → in_review → published / archived) |
| `insertDraft(opts)` | INSERT with `created_by`/`updated_by` and `draft` status |
| `deleteRecord(opts)` | DELETE with FK-violation detection |

Each entity file (e.g. `lib/actions/trek-routes.ts`) defines a `FIELDS` whitelist (column → cast/transform), a Zod schema, then re-exports `update*`, `set*Status`, `create*`, `delete*` wired to those primitives.

Optimistic locking: pass `expectedUpdatedAt` (the ISO string from the last server response); the UPDATE adds `WHERE date_trunc('milliseconds', updated_at) = $n`. A zero-rowcount result sets `conflict: true` on the returned `ActionResult`.

Shared transform helpers: `toIntOrNull`, `toFloatOrNull`, `toBool`, `toJsonbArray` (converts bullet-separated text to a JSONB array).

### Page / component layout

```
app/layout.tsx          — root layout (TopBar + Shell + Toaster)
components/Shell.tsx    — client wrapper; hides sidebar on /login
components/Sidebar.tsx  — 260px fixed sidebar nav
components/TopBar.tsx   — 64px fixed top bar (async server component for auth)
```

Entity pages follow this pattern:
- `app/<entity>/page.tsx` — async server component, calls db getters, renders list UI
- `app/<entity>/[id]/page.tsx` — async server component, fetches one row, passes to client detail
- `components/<Entity>DetailClient.tsx` (or co-located `<EntityClient>.tsx`) — `'use client'` editor

### Map editing (`components/map/`)

MapLibre GL + Terra Draw. Three geometry editor components handle the editor → save flow:
- `PointGeomEditor` — single marker drag
- `LineGeomEditor` — polyline draw/edit (saves as MultiLineString)
- `PolygonGeomEditor` — polygon draw/edit (saves as MultiPolygon)

All call `lib/actions/geom.ts → updateGeom()` which normalizes geometry types and runs a PostGIS `ST_GeomFromGeoJSON` update.

### Path alias

`@/*` resolves to the repo root (not `src/`). `@/lib/db` → `lib/db.ts`, `@/components/Shell` → `components/Shell.tsx`, etc.

## Adding a new entity

1. Add getter functions + TypeScript interface to `lib/db.ts`.
2. Create `lib/actions/<entity>.ts` with `FIELDS`, Zod schema, and the four action exports.
3. Create `app/<entity>/page.tsx` (list) and `app/<entity>/[id]/page.tsx` (edit).
4. Add the route to `components/Sidebar.tsx`.
5. If the entity has geometry, use one of the three geometry editor components and add an entry to `ENTITY_SPEC` in `lib/actions/geom.ts`.
