/**
 * GET /api/reports/[reportId]
 * Retrieve a previously generated PDF report from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await params;

    // Fetch report from database
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        portfolio: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Verify user has access to this report
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check authorization
    const isAuthorized =
      report.userId === user.id ||
      report.portfolio?.userId === user.id ||
      user.role === 'ADMIN';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to access this report' },
        { status: 403 }
      );
    }

    // Increment download count
    await prisma.report.update({
      where: { id: reportId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    // Check if report has expired
    if (report.expiresAt && new Date(report.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This report has expired' },
        { status: 410 }
      );
    }

    // Return PDF from database or URL
    if (report.fileBlob) {
      // Return from database blob - convert Uint8Array to Buffer
      const buffer = Buffer.from(report.fileBlob);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': report.mimeType,
          'Content-Disposition': `attachment; filename="${report.fileName}"`,
          'Content-Length': report.fileSize?.toString() || '0',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } else if (report.fileUrl) {
      // Redirect to external URL (Vercel Blob, S3, etc.)
      return NextResponse.redirect(report.fileUrl);
    } else {
      return NextResponse.json(
        { error: 'Report file not available' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Report retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/[reportId]
 * Delete a report from the database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = await params;

    // Fetch report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Verify user has access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (report.userId !== user.id && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this report' },
        { status: 403 }
      );
    }

    // Delete report
    await prisma.report.delete({
      where: { id: reportId },
    });

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Report deletion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
