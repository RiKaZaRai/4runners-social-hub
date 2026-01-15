import { prisma } from '@/lib/db';
import { AuthenticatedRequest } from '@/lib/api-auth';
import { canManageSpace } from '@/lib/space-users';

export async function ensureTenantExists(spaceId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: spaceId } });
  if (!tenant) {
    throw new Error('NOT_FOUND');
  }
  return tenant;
}

export async function requireManageAccess(
  auth: AuthenticatedRequest,
  spaceId: string
) {
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: spaceId, userId: auth.userId } }
  });

  if (!canManageSpace(auth.role, Boolean(membership))) {
    throw new Error('FORBIDDEN');
  }

  return membership;
}
