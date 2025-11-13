/**
 * Admin User Management API Routes
 *
 * Endpoints for individual user operations:
 * - PATCH: Update user (role, name, email)
 * - DELETE: Delete user
 */

import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    // Require ADMIN role
    const { session, error } = await requireRole('ADMIN');
    if (error) return error;

    const { userId } = await params;

    const body = await request.json();
    const { email, name, role, password } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) {
      const validRoles = ['FOUNDER', 'INVESTOR', 'ADMIN'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.role = role;
    }
    if (password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from removing their own admin role
    if (session!.user.id === userId && role && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 });
    }

    // Check email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      user: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    // Require ADMIN role
    const { session, error } = await requireRole('ADMIN');
    if (error) return error;

    const { userId } = await params;

    // Prevent admin from deleting themselves
    if (session!.user.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
