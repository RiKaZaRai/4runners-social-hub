import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { commentSchema } from '@/lib/validators';
import { requireAuth, requireActiveTenantAccess, handleApiError } from '@/lib/api-auth';
import { isClientRole } from '@/lib/roles';
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
      body: form.get('body')?.toString(),
      authorRole: isClientRole(auth.role) ? 'client' : 'agency'
    };
    const tenantId = form.get('tenantId')?.toString();

    const parsed = commentSchema.safeParse(data);
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

    // Verify tenant access (also checks if tenant is active)
    await requireActiveTenantAccess(auth, post.tenantId);

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          postId: parsed.data.postId,
          body: parsed.data.body,
          authorRole: parsed.data.authorRole
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: post.tenantId,
          action: 'comment.create',
          entityType: 'comment',
          entityId: newComment.id,
          payload: { postId: parsed.data.postId, userId: auth.userId }
        }
      });

      return newComment;
    });

    const redirectUrl = tenantId
      ? `/posts?tenantId=${tenantId}&postId=${comment.postId}`
      : `/posts?postId=${comment.postId}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
