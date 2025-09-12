import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { analysis, userId } = body as { analysis?: unknown; userId?: string };

    if (analysis === undefined) {
      return NextResponse.json({ error: "Missing analysis" }, { status: 400 });
    }

    const result = await prisma.analysis.create({
      data: {
        analysis,
        ...(userId ? { userId } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        analysis: true,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Save Analysis API error", err);
    return NextResponse.json(
      { error: "Failed to save analysis" },
      { status: 500 }
    );
  }
}

