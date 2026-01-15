import crypto from 'crypto';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, handleApiError, requireActiveTenantAccess } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import { createInboxItem } from '@/lib/inbox';
import { INVITE_EXPIRATION_MS, normalizeEmail, isInviteExpired } from '@/lib/space-users';
import { requireManageAccess, ensureTenantExists } from '@/lib/space-guards';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'client_admin'])
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await context.params;
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');

    if (isClientRole(auth.role)) {
      await requireActiveTenantAccess(auth, spaceId);
    } else if (isAgencyRole(auth.role)) {
      await requireManageAccess(auth, spaceId);
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [memberships, invites] = await Promise.all([
      prisma.tenantMembership.findMany({
        where: { tenantId: spaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.spaceInvite.findMany({
        where: { spaceId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return NextResponse.json({ members: memberships, invites });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await context.params;
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);
    await requireManageAccess(auth, spaceId);

    const tenant = await ensureTenantExists(spaceId);

    const payload = await req.json();
    const parsed = inviteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const targetUser = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isClientRole(targetUser.role)) {
      return NextResponse.json({ error: 'Only client users can be invited' }, { status: 400 });
    }

    const existingMembership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: spaceId, userId: targetUser.id } }
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'User already a member' }, { status: 409 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS);
    const existingInvite = await prisma.spaceInvite.findUnique({
      where: { spaceId_email: { spaceId, email: normalizedEmail } }
    });

    let invite;
    let wasNew = false;

    if (existingInvite) {
      if (!isInviteExpired(existingInvite)) {
        return NextResponse.json({ error: 'Invitation already sent' }, { status: 409 });
      }

      invite = await prisma.spaceInvite.update({
        where: { spaceId_email: { spaceId, email: normalizedEmail } },
        data: {
          role: parsed.data.role,
          token,
          expiresAt,
          acceptedAt: null,
          acceptedBy: null,
          createdBy: auth.userId
        }
      });
    } else {
      wasNew = true;
      invite = await prisma.spaceInvite.create({
        data: {
          spaceId,
          email: normalizedEmail,
          role: parsed.data.role,
          token,
          expiresAt,
          createdBy: auth.userId
        }
      });
    }

    await createInboxItem({
      spaceId,
      type: 'message',
      actorType: 'agency',
      title: 'Invitation envoyée',
      description: `Invitation ${parsed.data.role === 'client_admin' ? 'Client admin' : 'Client user'} pour ${normalizedEmail} sur ${tenant.name}`,
      actionUrl: `/spaces/${spaceId}/users`,
      entityKey: `space_invites:${spaceId}`,
      status: 'unread'
    });

    return NextResponse.json(invite, { status: wasNew ? 201 : 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
