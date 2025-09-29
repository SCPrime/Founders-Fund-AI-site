import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, portfolioId: true, imageUrl: true, userLabel: true, createdAt: true, contributions: true },
  });
  const res = NextResponse.json({ ok: true, scans });
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}