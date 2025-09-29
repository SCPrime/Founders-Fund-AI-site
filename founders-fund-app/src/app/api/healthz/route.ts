import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Ensure Node.js runtime for database operations
export const runtime = 'nodejs';

export async function GET() {
  try {
    const prisma = new PrismaClient();

    try {
      // Enhanced database probe with timestamp
      const [row] = await prisma.$queryRawUnsafe<{ now: Date }[]>(`select now() as now`);
      await prisma.$disconnect();

      return NextResponse.json({
        ok: true,
        db: true,
        ts: row?.now ?? new Date(),
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString(),
        envVars: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          NODE_ENV: process.env.NODE_ENV
        }
      });

    } catch (dbError) {
      await prisma.$disconnect();

      return NextResponse.json({
        ok: true,
        db: false,
        error: dbError instanceof Error ? dbError.message : 'Database connection failed',
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    return NextResponse.json({
      ok: false,
      db: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}