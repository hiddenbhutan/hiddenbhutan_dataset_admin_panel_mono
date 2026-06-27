import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifySession } from '@/lib/session';

/**
 * Gates the entire admin panel behind a valid session cookie.
 *
 * Allowlist: `/login`, Next.js internal/static paths. Everything else
 * requires a verified JWT. The `next` query param preserves the destination.
 *
 * (Replaces the deprecated `middleware.ts` convention in Next.js 16.)
 */

const PUBLIC_PREFIXES = ['/login', '/_next', '/favicon', '/api/auth'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySession(token);
    if (session) return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
