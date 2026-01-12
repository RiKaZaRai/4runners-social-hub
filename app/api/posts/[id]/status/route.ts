import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postStatusSchema } from '@/lib/validators';
import { canTransition } from '@/lib/workflow';
import { requireAuth, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

const clientAllowedStatuses = ['approved', 'changes_requested'];

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);

    const params = await context.params;
    const form = await req.formData();
    const status = form.get('status')?.toString();
    const tenantId = form.get('tenantId')?.toString();

    const parsed = postStatusSchema.safeParse(status);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, tenantId: true, status: true }
    });

    if (!post) {
      throw new Error('NOT_FOUND');
    }

    requireTenantAccess(auth, post.tenantId);

    if (auth.role === 'client' && !clientAllowedStatuses.includes(parsed.data)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!canTransition(post.status, parsed.data)) {
      return NextResponse.json({ error: 'Invalid transition' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: params.id },
        data: { status: parsed.data }
      });

      await tx.auditLog.create({
        data: {
          tenantId: post.tenantId,
          action: 'post.status.update',
          entityType: 'post',
          entityId: post.id,
          payload: { status: parsed.data, userId: auth.userId }
        }
      });
    });

    const redirectUrl = tenantId
      ? `/posts?tenantId=${tenantId}&postId=${post.id}`
      : `/posts?postId=${post.id}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
