import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { setSessionCookie } from '@/lib/session';
import { getBootstrapData } from '@/lib/server-data';

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ message: 'Username atau password salah' }, { status: 401 });
  }

  setSessionCookie(user.id);
  return NextResponse.json(await getBootstrapData(user));
}
