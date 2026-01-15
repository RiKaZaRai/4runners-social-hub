import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, handleApiError } from '@/lib/api-auth';
import { requireRateLimit } from '@/lib/rate-limit';
import { isAgencyRole, isClientRole } from '@/lib/roles';

export async function GET() {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');

    const isAgency = isAgencyRole(auth.role);
    const isClient = isClientRole(auth.role);

    let items;

    if (isAgency) {
      // Agence voit tous les items
      items = await prisma.inboxItem.findMany({
        include: {
          space: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else if (isClient) {
      // Client voit uniquement les items de ses espaces
      const memberships = await prisma.tenantMembership.findMany({
        where: { userId: auth.userId },
        select: { tenantId: true }
      });
      const spaceIds = memberships.map((m) => m.tenantId);

      items = await prisma.inboxItem.findMany({
        where: { spaceId: { in: spaceIds } },
        include: {
          space: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else {
      items = [];
    }

    return NextResponse.json(items);
  } catch (error) {
    return handleApiError(error);
  }
}
