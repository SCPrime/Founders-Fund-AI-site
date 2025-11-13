import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { put } from '@vercel/blob';
import { BASELINE_PORTFOLIO_ID } from '@/lib/constants';
import { requireAuth } from '@/lib/auth';
import { canAccessPortfolio } from '@/lib/privacy';

export const runtime = 'nodejs';

type IncomingContribution = {
  owner: 'investor'|'founders';
  name: string;
  type: 'investor_contribution'|'founders_contribution'|'entry_fee';
  amount: number;
  ts: string; // yyyy-mm-dd or ISO
  earnsDollarDaysThisWindow?: boolean;
};

function toISODate(s: string) {
  // normalize 'YYYY-MM-DD' into ISO midnight UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00Z`);
  return new Date(s);
}

async function upsertContribution(c: IncomingContribution, portfolioId: string) {
  const ts = toISODate(c.ts);
  // "Idempotent" check: exact match on portfolioId+owner+name+type+amount+ts
  const existing = await prisma.contribution.findFirst({
    where: {
      portfolioId,
      owner: c.owner,
      name: c.name,
      type: c.type,
      amount: c.amount,
      ts,
    },
  });
  if (existing) return existing;

  return prisma.contribution.create({
    data: {
      portfolioId,
      owner: c.owner,
      name: c.name,
      type: c.type,
      amount: c.amount,
      ts,
      earnsDollarDaysThisWindow: c.earnsDollarDaysThisWindow ?? true,
    },
  });
}

export async function POST(req: NextRequest) {
  // Authentication check - require user to be logged in
  const { session, error: authError } = await requireAuth();
  if (authError) {
    return authError;
  }

  // Rate limit: 10 saves/min/IP
  const ip = headers().get('x-forwarded-for') ?? 'unknown';
  const rl = rateLimit(`scan-save:${ip}`, 10, 60_000);
  const rlHeaders = {
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
  };
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...rlHeaders, 'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now())/1000))) } }
    );
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const metaRaw = form.get('meta') as string | null;
  const meta = metaRaw ? JSON.parse(metaRaw) : {};

  const portfolioId: string = meta.portfolioId || BASELINE_PORTFOLIO_ID;
  const userLabel: string | undefined = meta.userLabel;
  const ocrText: string | undefined = meta.ocrText;
  const ai: any = meta.ai ?? null;
  const contributions: IncomingContribution[] = Array.isArray(meta.contributions) ? meta.contributions : [];

  // Authorization check - verify user has access to this portfolio
  if (portfolioId !== BASELINE_PORTFOLIO_ID) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { userId: true },
    });

    if (portfolio) {
      const canAccess = canAccessPortfolio(portfolio.userId, {
        userId: session!.user.id,
        userRole: session!.user.role,
        userName: session!.user.name,
      });

      if (!canAccess) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have access to this portfolio.' },
          { status: 403 }
        );
      }
    }
  }

  // Try to store the image in Vercel Blob if token is configured; otherwise skip gracefully
  let imageUrl: string | undefined;
  if (file) {
    try {
      const bytes = await file.arrayBuffer();
      const blob = await put(`scans/${Date.now()}_${file.name || 'scan'}`, Buffer.from(bytes), {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
      });
      imageUrl = blob.url;
    } catch (e) {
      console.warn('Blob upload skipped or failed; continuing without imageUrl', e);
    }
  }

  const committed = [];
  for (const c of contributions) {
    try {
      const row = await upsertContribution(c, portfolioId);
      committed.push({ id: row.id, ...c });
    } catch (e) {
      console.error('Contribution upsert failed', c, e);
    }
  }

  const scan = await prisma.scan.create({
    data: {
      portfolioId,
      imageUrl,
      ocrText,
      ai,
      contributions: committed,
      userLabel,
    },
  });

  const res = NextResponse.json({ ok: true, scanId: scan.id, imageUrl, committedCount: committed.length });
  Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  res.headers.set('Vary', 'x-forwarded-for');
  return res;
}