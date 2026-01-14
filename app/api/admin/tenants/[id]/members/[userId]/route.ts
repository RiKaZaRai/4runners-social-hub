import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { isAgencyAdmin, isAgencyManager, isAgencyProduction, isClientRole } from '@/lib/roles';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    // Verify session
    const session = await requireSession();

    // CSRF protection
    await requireCsrfToken(req);

    // Verify user access
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || isAgencyProduction(user.role) || isClientRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (isAgencyManager(user.role)) {
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: id, userId: session.userId } }
      });
      if (!membership) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (!isAgencyAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 });
    }

    if (role !== 'viewer' && role !== 'client_admin') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isClientRole(targetUser.role)) {
      return NextResponse.json({ error: 'Only client users can be updated here' }, { status: 400 });
    }

    // Update membership role
    const membership = await prisma.tenantMembership.update({
      where: {
        tenantId_userId: {
          tenantId: id,
          userId
        }
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return NextResponse.json(membership);
  } catch (error) {
    console.error('Error updating member role:', error);

    // Handle not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    // Verify session
    const session = await requireSession();

    // CSRF protection
    await requireCsrfToken(req);

    // Verify user access
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || isAgencyProduction(user.role) || isClientRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (isAgencyManager(user.role)) {
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: id, userId: session.userId } }
      });
      if (!membership) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (!isAgencyAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete membership
    await prisma.tenantMembership.delete({
      where: {
        tenantId_userId: {
          tenantId: id,
          userId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);

    // Handle not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
