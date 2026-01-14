import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ideaSchema } from '@/lib/validators';
import { requireAuth, requireActiveTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  try {
    // Authenticate the user
    const auth = await requireAuth();

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    // Verify tenant access
    await requireActiveTenantAccess(auth, tenantId);

    const ideas = await prisma.idea.findMany({
      where: { tenantId: tenantId! },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(ideas);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    // Authenticate the user
    const auth = await requireAuth();

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    // CSRF protection
    await requireCsrfToken(req);

    const form = await req.formData();
    const data = {
      tenantId: form.get('tenantId')?.toString(),
      title: form.get('title')?.toString(),
      description: form.get('description')?.toString()
    };

    const parsed = ideaSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify tenant access
    await requireActiveTenantAccess(auth, parsed.data.tenantId);

    const idea = await prisma.$transaction(async (tx) => {
      const newIdea = await tx.idea.create({
        data: parsed.data
      });

      await tx.auditLog.create({
        data: {
          tenantId: newIdea.tenantId,
          action: 'idea.create',
          entityType: 'idea',
          entityId: newIdea.id,
          payload: { title: newIdea.title, userId: auth.userId }
        }
      });

      return newIdea;
    });

    return NextResponse.json(idea);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    // Authenticate the user
    const auth = await requireAuth();

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    // CSRF protection
    await requireCsrfToken(req);

    const form = await req.formData();
    const id = form.get('id')?.toString();
    const status = form.get('status')?.toString();

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    // Validate status is a valid enum value
    const validStatuses = ['new', 'accepted', 'declined', 'converted'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Fetch existing idea to verify tenant access
    const existing = await prisma.idea.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    await requireActiveTenantAccess(auth, existing.tenantId);

    const idea = await prisma.$transaction(async (tx) => {
      const updatedIdea = await tx.idea.update({
        where: { id },
        data: { status: status as 'new' | 'accepted' | 'declined' | 'converted' }
      });

      await tx.auditLog.create({
        data: {
          tenantId: updatedIdea.tenantId,
          action: 'idea.update',
          entityType: 'idea',
          entityId: updatedIdea.id,
          payload: { status, userId: auth.userId }
        }
      });

      return updatedIdea;
    });

    return NextResponse.json(idea);
  } catch (error) {
    return handleApiError(error);
  }
}
