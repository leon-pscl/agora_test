import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/') {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const destination = session.role === 'admin' ? '/dashboard' : '/call';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (pathname.startsWith('/login')) {
    if (session) {
      const destination = session.role === 'admin' ? '/dashboard' : '/call';
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/call', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/call')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/api/landlords/') &&
    (request.method === 'PUT' || request.method === 'DELETE')
  ) {
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }
  }

  if (
    pathname.startsWith('/api/schedules') &&
    (request.method === 'POST' ||
      request.method === 'PATCH' ||
      request.method === 'DELETE')
  ) {
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/call/:path*',
    '/api/landlords/:path*',
    '/api/schedules',
  ],
};
