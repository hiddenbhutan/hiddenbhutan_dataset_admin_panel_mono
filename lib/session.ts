/**
 * Session JWT helpers.
 *
 * - Signed with HS256 via jose (edge-runtime safe — middleware can call verify())
 * - Stored in an httpOnly + sameSite=lax cookie
 * - Two-week default expiry; configurable via SESSION_MAX_AGE_DAYS
 *
 * Use:
 *   `signSession({ sub, email, name, role })` → string
 *   `verifySession(token)` → payload or null
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const ALG = 'HS256';
const ENC = new TextEncoder();

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'hb_session';
const MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 14);
export const COOKIE_MAX_AGE_S = MAX_AGE_DAYS * 24 * 60 * 60;

function secret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error('SESSION_SECRET missing or too short (set in .env.local)');
  }
  return ENC.encode(raw);
}

export interface SessionPayload extends JWTPayload {
  sub: string;            // admin.users.id as string
  email: string;
  name: string;
  role: string;
}

export async function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (!payload.sub || !payload.email || !payload.role) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
