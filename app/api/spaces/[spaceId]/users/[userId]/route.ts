import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { isClientRole } from '@/lib/roles';
import { ensureTenantExists, requireManageAccess } from '@/lib/space-guards';
import { prisma } from '@/lib/db';

const memberRoleSchema = z.object({
  role: z.enum(['viewer', 'client_admin'])
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string; userId: string }> }
) {
  try {
    const { spaceId, userId } = await context.params;
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);
    await requireManageAccess(auth, spaceId);
    await ensureTenantExists(spaceId);

    const payload = await req.json();
    const parsed = memberRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isClientRole(targetUser.role)) {
      return NextResponse.json({ error: 'Only client users can be updated' }, { status: 400 });
    }

    const membership = await prisma.tenantMembership.update({
      where: {
        tenantId_userId: {
          tenantId: spaceId,
          userId
        }
      },
      data: { role: parsed.data.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    return NextResponse.json(membership);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string; userId: string }> }
) {
  try {
    const { spaceId, userId } = await context.params;
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);
    await requireManageAccess(auth, spaceId);
    await ensureTenantExists(spaceId);

    await prisma.tenantMembership.delete({
      where: {
        tenantId_userId: {
          tenantId: spaceId,
          userId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    return handleApiError(error);
  }
}
