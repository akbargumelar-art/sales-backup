import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getCurrentUser } from '@/lib/session';
import { getBootstrapData } from '@/lib/server-data';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
  }

  const body = await request.json();
  const password = String(body.password ?? '');
  if (password.length < 8) {
    return NextResponse.json({ message: 'Password minimal 8 karakter' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      passwordHash: hashPassword(password),
      mustChangePassword: false,
    },
  });

  return NextResponse.json(await getBootstrapData(user));
}
