import type { NextRequest } from 'next/server';

export type UserRole = 'admin' | 'user';

export interface SessionPayload {
  username: string;
  role: UserRole;
  exp: number;
}

export const SESSION_COOKIE = 'agora_session';

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): string {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const session: SessionPayload = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return base64UrlEncode(JSON.stringify(session));
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(token)) as SessionPayload;
    if (!payload.username || !payload.role || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    if (payload.role !== 'admin' && payload.role !== 'user') return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function validateCredentials(
  username: string,
  password: string,
): Omit<SessionPayload, 'exp'> | null {
  const accounts: Array<Omit<SessionPayload, 'exp'>> = [
    {
      username: process.env.ADMIN_USERNAME ?? 'admin',
      role: 'admin',
    },
    {
      username: process.env.USER_USERNAME ?? 'user',
      role: 'user',
    },
  ];

  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const userPassword = process.env.USER_PASSWORD ?? 'user123';

  const account = accounts.find((entry) => entry.username === username);
  if (!account) return null;

  const expectedPassword = account.role === 'admin' ? adminPassword : userPassword;
  if (password !== expectedPassword) return null;

  return account;
}

export function isAdmin(session: SessionPayload | null): boolean {
  return session?.role === 'admin';
}
