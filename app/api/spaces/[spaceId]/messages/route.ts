import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { spaceMessageSchema } from '@/lib/validators';
import { createInboxItem } from '@/lib/inbox';
import { requireAuth, requireActiveTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import type { CommentRole } from '@prisma/client';

const MESSAGE_TAKE = 50;

function buildPreview(body: string) {
  const cleaned = body.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 80) return cleaned;
  return `${cleaned.slice(0, 77)}...`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');

    const { spaceId } = await context.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: spaceId },
      select: { id: true, active: true }
    });

    if (!tenant) {
      throw new Error('NOT_FOUND');
    }

    if (isClientRole(auth.role)) {
      await requireActiveTenantAccess(auth, spaceId);
    } else if (!isAgencyRole(auth.role)) {
      throw new Error('FORBIDDEN');
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const cursorDate = cursor ? new Date(cursor) : null;

    const messages = await prisma.spaceMessage.findMany({
      where: {
        spaceId,
        ...(cursorDate && !Number.isNaN(cursorDate.getTime())
          ? { createdAt: { lt: cursorDate } }
          : {})
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_TAKE
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);

    const { spaceId } = await context.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: spaceId },
      select: { id: true, active: true }
    });

    if (!tenant) {
      throw new Error('NOT_FOUND');
    }

    if (isClientRole(auth.role)) {
      await requireActiveTenantAccess(auth, spaceId);
    } else if (!isAgencyRole(auth.role)) {
      throw new Error('FORBIDDEN');
    }

    let payload: unknown = null;
    try {
      payload = await req.json();
    } catch {
      throw new Error('INVALID_INPUT');
    }

    const parsed = spaceMessageSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data.body.trim();
    if (!body) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const authorRole: CommentRole = isClientRole(auth.role) ? 'client' : 'agency';

    const message = await prisma.spaceMessage.create({
      data: {
        spaceId,
        authorUserId: auth.userId,
        authorRole,
        body
      }
    });

    const description = buildPreview(body);
    await createInboxItem({
      spaceId,
      type: 'message',
      actorType: authorRole,
      title: authorRole === 'client' ? 'Nouveau message client' : 'Message agence',
      description,
      actionUrl: `/spaces/${spaceId}/messages`,
      entityKey: `space_messages:${spaceId}`
    });

    return NextResponse.json(message);
  } catch (error) {
    return handleApiError(error);
  }
}
