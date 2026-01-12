import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checklistSchema } from '@/lib/validators';
import { requireAuth, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

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
      postId: form.get('postId')?.toString(),
      label: form.get('label')?.toString(),
      checked: form.get('checked')?.toString() === 'true'
    };
    const tenantId = form.get('tenantId')?.toString();

    const parsed = checklistSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify that the post exists and get its tenant
    const post = await prisma.post.findUnique({
      where: { id: parsed.data.postId },
      select: { tenantId: true }
    });

    if (!post) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    requireTenantAccess(auth, post.tenantId);

    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.checklistItem.create({
        data: {
          postId: parsed.data.postId,
          label: parsed.data.label,
          checked: parsed.data.checked ?? false
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: post.tenantId,
          action: 'checklist.create',
          entityType: 'checklistItem',
          entityId: newItem.id,
          payload: { postId: parsed.data.postId, userId: auth.userId }
        }
      });

      return newItem;
    });

    const redirectUrl = tenantId
      ? `/posts/${parsed.data.postId}?tenantId=${tenantId}`
      : `/posts/${parsed.data.postId}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
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
    const checked = form.get('checked')?.toString() === 'true';

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify that the checklist item exists and get its post's tenant
    const existing = await prisma.checklistItem.findUnique({
      where: { id },
      include: {
        post: {
          select: { tenantId: true }
        }
      }
    });

    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    requireTenantAccess(auth, existing.post.tenantId);

    const item = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.checklistItem.update({
        where: { id },
        data: { checked }
      });

      await tx.auditLog.create({
        data: {
          tenantId: existing.post.tenantId,
          action: 'checklist.update',
          entityType: 'checklistItem',
          entityId: updatedItem.id,
          payload: { checked, userId: auth.userId }
        }
      });

      return updatedItem;
    });

    return NextResponse.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}
