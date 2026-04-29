import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getBootstrapData } from '@/lib/server-data';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await getBootstrapData(user));
}
