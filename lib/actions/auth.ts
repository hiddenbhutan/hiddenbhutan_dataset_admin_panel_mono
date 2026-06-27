'use server';

/**
 * Login + logout server actions.
 *
 * Login verifies email + password against admin.users.password_hash (bcrypt),
 * signs a JWT, and sets it as an httpOnly cookie. Logout clears the cookie
 * and bounces to /login.
 */

import 'server-only';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Pool } from 'pg';
import { COOKIE_MAX_AGE_S, COOKIE_NAME, signSession } from '../session';

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

const LoginSchema = z.object({
  email:    z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export interface LoginResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const raw = {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.') || '_';
      errors[field] = issue.message;
    }
    return { ok: false, message: 'Validation failed', errors };
  }

  const r = await pool().query<{
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    password_hash: string;
  }>(
    `SELECT id, email, full_name, role, is_active, password_hash
       FROM admin.users
      WHERE lower(email) = lower($1)`,
    [parsed.data.email],
  );
  const user = r.rows[0];
  if (!user || !user.is_active) {
    return { ok: false, message: 'Invalid email or password' };
  }
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) {
    return { ok: false, message: 'Invalid email or password' };
  }

  const token = await signSession({
    sub:   String(user.id),
    email: user.email,
    name:  user.full_name,
    role:  user.role,
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_S,
    path: '/',
  });

  await pool().query(
    `UPDATE admin.users SET last_login_at = now() WHERE id = $1`,
    [user.id],
  );

  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect('/login');
}
