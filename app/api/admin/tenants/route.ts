import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { canCreateClients } from '@/lib/roles';

export async function POST(req: Request) {
  try {
    // Verify session
    const session = await requireSession();

    // CSRF protection
    await requireCsrfToken(req);

    // Verify user is agency_admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!canCreateClients(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create tenant and attach creator membership so it appears in sidebar
    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: { name: name.trim() }
      });
      await tx.tenantMembership.create({
        data: {
          tenantId: created.id,
          userId: session.userId,
          role: 'viewer'
        }
      });
      return created;
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
