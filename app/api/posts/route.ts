import { NextResponse } from 'next/server';
import { createPostSchema } from '@/lib/validators';
import { prisma } from '@/lib/db';
import { requireAuth, requireAgency, requireTenantAccess, handleApiError } from '@/lib/api-auth';
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
    requireTenantAccess(auth, tenantId);

    const posts = await prisma.post.findMany({
      where: { tenantId: tenantId! },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(posts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    // Authenticate the user
    const auth = await requireAuth();
    requireAgency(auth);

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    // CSRF protection
    await requireCsrfToken(req);

    const form = await req.formData();
    const data = {
      tenantId: form.get('tenantId')?.toString(),
      title: form.get('title')?.toString(),
      body: form.get('body')?.toString(),
      network: form.get('network')?.toString()
    };

    const parsed = createPostSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verify tenant access
    requireTenantAccess(auth, parsed.data.tenantId);

    // Use a transaction to ensure data consistency
    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          tenantId: parsed.data.tenantId,
          title: parsed.data.title,
          body: parsed.data.body,
          network: parsed.data.network ?? 'linkedin'
        }
      });

      await tx.postVersion.create({
        data: {
          postId: newPost.id,
          title: newPost.title,
          body: newPost.body
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: newPost.tenantId,
          action: 'post.create',
          entityType: 'post',
          entityId: newPost.id,
          payload: { title: newPost.title, userId: auth.userId }
        }
      });

      return newPost;
    });

    return NextResponse.redirect(
      new URL(`/posts?tenantId=${post.tenantId}&postId=${post.id}`, req.url)
    );
  } catch (error) {
    return handleApiError(error);
  }
}
