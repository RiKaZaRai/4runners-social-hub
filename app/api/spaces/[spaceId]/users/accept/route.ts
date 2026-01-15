import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { createInboxItem } from '@/lib/inbox';
import { normalizeEmail, validateInviteForAcceptance } from '@/lib/space-users';
import { ensureTenantExists } from '@/lib/space-guards';
import { prisma } from '@/lib/db';
import { isClientRole } from '@/lib/roles';

const acceptSchema = z.object({
  token: z.string().min(1)
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await context.params;
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);
    const tenant = await ensureTenantExists(spaceId);

    const parsed = acceptSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const invite = await prisma.spaceInvite.findFirst({
      where: { spaceId, token: parsed.data.token }
    });

    const validationError = validateInviteForAcceptance(invite);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const normalizedInviteEmail = normalizeEmail(invite.email);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId }
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (normalizeEmail(user.email) !== normalizedInviteEmail) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 });
    }

    const existingMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: spaceId, userId: user.id } }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }

    const membership = await prisma.tenantMembership.create({
      data: {
        tenantId: spaceId,
        userId: user.id,
        role: invite.role
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    await prisma.spaceInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        acceptedBy: auth.userId
      }
    });

    await createInboxItem({
      spaceId,
      type: 'message',
      actorType: isClientRole(auth.role) ? 'client' : 'agency',
      title: 'Utilisateur a rejoint',
      description: `${user.email} a rejoint ${tenant.name}`,
      actionUrl: `/spaces/${spaceId}/users`,
      entityKey: `invite:${spaceId}:${normalizedInviteEmail}`,
      status: 'open'
    });

    return NextResponse.json(membership);
  } catch (error) {
    return handleApiError(error);
  }
}
