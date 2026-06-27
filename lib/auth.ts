/**
 * Session-backed auth helpers.
 *
 * `getCurrentAdminUser()` reads the JWT cookie set by the login action and
 * returns the admin.users row. Server actions and pages call it; if no valid
 * session exists, it throws — pages should redirect to /login first via
 * middleware, server actions should treat the throw as a 401.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { Pool } from 'pg';
import { COOKIE_NAME, verifySession } from './session';

export interface CurrentAdmin {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return _pool;
}

// Cache per-request, not per-process — we want logout to take effect on the
// next request. (Next 15+ caches cookies() within the same RSC render anyway.)
export async function getCurrentAdminUser(): Promise<CurrentAdmin> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) throw new AuthRequired();
  const session = await verifySession(token);
  if (!session) throw new AuthRequired();

  const r = await pool().query<CurrentAdmin>(
    `SELECT id, email, full_name, role
       FROM admin.users
      WHERE id = $1 AND is_active = TRUE`,
    [Number(session.sub)],
  );
  if (!r.rows[0]) throw new AuthRequired();
  return r.rows[0];
}

/** Like `getCurrentAdminUser` but returns null instead of throwing. */
export async function getCurrentAdminUserOrNull(): Promise<CurrentAdmin | null> {
  try {
    return await getCurrentAdminUser();
  } catch {
    return null;
  }
}

export class AuthRequired extends Error {
  constructor() { super('Not authenticated'); this.name = 'AuthRequired'; }
}
