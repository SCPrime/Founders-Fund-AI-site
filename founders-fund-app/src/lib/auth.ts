import { getServerSession } from 'next-auth/next';
import type { PrivacyContext } from './privacy';
import { NextResponse } from 'next/server';

/**
 * Get the current session in API routes
 * Returns null if no session exists
 * Note: authOptions is auto-discovered from /api/auth/[...nextauth]/route.ts
 */
export async function getSession() {
  return await getServerSession();
}

/**
 * Get authenticated user context for privacy filtering
 * Throws error if no session exists
 */
export async function getAuthContext(): Promise<PrivacyContext> {
  const session = await getSession();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return {
    userId: session.user.id,
    userRole: session.user.role,
    userName: session.user.name,
  };
}

/**
 * Require authentication in API routes
 * Returns session or error response
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      ),
      session: null,
    };
  }

  return { session, error: null };
}

/**
 * Require specific role in API routes
 * Returns session or error response
 */
export async function requireRole(...allowedRoles: string[]) {
  const { session, error } = await requireAuth();

  if (error) {
    return { session: null, error };
  }

  if (!allowedRoles.includes(session!.user.role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { session, error: null };
}
