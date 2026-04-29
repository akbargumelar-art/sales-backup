import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'salestrack_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.APP_SECRET || 'salestrack-local-dev-secret';
}

function base64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function verify(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    userId: string;
    expiresAt: number;
  };
  if (!parsed.userId || parsed.expiresAt < Date.now()) return null;
  return parsed;
}

export function setSessionCookie(userId: string) {
  const payload = base64url(JSON.stringify({
    userId,
    expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
  }));
  const token = `${payload}.${sign(payload)}`;
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verify(token);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}
