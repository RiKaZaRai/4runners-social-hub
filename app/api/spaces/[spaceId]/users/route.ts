import crypto from 'crypto';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, handleApiError, requireActiveTenantAccess } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { isAgencyAdmin, isAgencyRole, isClientRole } from '@/lib/roles';
import { createInboxItem } from '@/lib/inbox';
import { INVITE_EXPIRATION_MS, normalizeEmail, isInviteExpired } from '@/lib/space-users';
import { requireManageAccess, ensureTenantExists } from '@/lib/space-guards';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'client_admin'])
});

const addAgencyMemberSchema = z.object({
  userId: z.string().uuid(),
  type: z.literal('agency')
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

    // Récupérer les membres existants (excluant les agency_admin)
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: spaceId,
        // Exclure les agency_admin qui ont accès à tout par défaut
        user: { role: { not: 'agency_admin' } }
      },
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
    });

    const invites = await prisma.spaceInvite.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'desc' }
    });

    // Pour les admins/managers agence: récupérer les utilisateurs agence disponibles
    let availableAgencyUsers: Array<{
      id: string;
      name: string | null;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
    }> = [];

    if (isAgencyAdmin(auth.role)) {
      const memberUserIds = memberships.map((m) => m.user.id);
      availableAgencyUsers = await prisma.user.findMany({
        where: {
          role: { in: ['agency_manager', 'agency_production'] },
          id: { notIn: memberUserIds }
        },
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        },
        orderBy: { email: 'asc' }
      });
    }

    return NextResponse.json({
      members: memberships,
      invites,
      availableAgencyUsers
    });
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

    // Cas 1: Ajout d'un utilisateur agence (association directe, sans invitation)
    const agencyParsed = addAgencyMemberSchema.safeParse(payload);
    if (agencyParsed.success) {
      // Seul un admin agence peut ajouter des utilisateurs agence
      if (!isAgencyAdmin(auth.role)) {
        return NextResponse.json(
          { error: 'Seuls les admins agence peuvent ajouter des membres agence' },
          { status: 403 }
        );
      }

      const agencyUser = await prisma.user.findUnique({
        where: { id: agencyParsed.data.userId }
      });

      if (!agencyUser) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
      }

      if (!isAgencyRole(agencyUser.role) || isAgencyAdmin(agencyUser.role)) {
        return NextResponse.json(
          { error: 'Seuls les managers et production agence peuvent être ajoutés' },
          { status: 400 }
        );
      }

      const existingMembership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: spaceId, userId: agencyUser.id } }
      });

      if (existingMembership) {
        return NextResponse.json({ error: 'Utilisateur déjà membre' }, { status: 409 });
      }

      const membership = await prisma.tenantMembership.create({
        data: {
          tenantId: spaceId,
          userId: agencyUser.id,
          role: 'viewer' // Les utilisateurs agence ont le rôle viewer dans le membership
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });

      return NextResponse.json(membership, { status: 201 });
    }

    // Cas 2: Invitation d'un utilisateur client (par email)
    const parsed = inviteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    let targetUser = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' }
      }
    });

    // Si l'utilisateur n'existe pas, on le crée avec le rôle client_user
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          role: 'client_user'
        }
      });
    }

    // Vérifier que c'est bien un utilisateur client (pas agence)
    if (!isClientRole(targetUser.role)) {
      return NextResponse.json(
        { error: 'Seuls les utilisateurs clients peuvent être invités via ce formulaire' },
        { status: 400 }
      );
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
