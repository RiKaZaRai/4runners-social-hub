import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { isAgencyAdmin, isAgencyManager, isAgencyProduction, isClientRole } from '@/lib/roles';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (role !== 'viewer' && role !== 'client_admin') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!isClientRole(targetUser.role)) {
      return NextResponse.json({ error: 'Only client users can be added here' }, { status: 400 });
    }

    // Create membership
    const membership = await prisma.tenantMembership.create({
      data: {
        tenantId: id,
        userId,
        role
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);

    // Handle unique constraint violation (user already a member)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
