import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { setSessionCookie } from '@/lib/session';
import { getBootstrapData } from '@/lib/server-data';

export async function POST(request: Request) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return NextResponse.json({ message: 'Setup awal sudah selesai' }, { status: 409 });
  }

  const body = await request.json();
  const nama = String(body.nama ?? '').trim();
  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const tap = String(body.tap ?? '').trim();

  if (!nama || !username || password.length < 8 || !tap) {
    return NextResponse.json({ message: 'Data admin awal tidak valid' }, { status: 400 });
  }

  const selectedTap = await prisma.tap.findUnique({ where: { kode: tap } });
  if (!selectedTap || !selectedTap.isActive) {
    return NextResponse.json({ message: 'TAP awal tidak valid' }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      nama,
      username,
      passwordHash: hashPassword(password),
      role: 'SUPER_ADMIN',
      tap,
      allowedTaps: ['ALL'],
      isActive: true,
      mustChangePassword: false,
    },
  });

  setSessionCookie(user.id);
  return NextResponse.json(await getBootstrapData(user));
}
