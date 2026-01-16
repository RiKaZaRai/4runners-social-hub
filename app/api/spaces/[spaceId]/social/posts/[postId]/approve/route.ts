import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAuth,
  requireTenantAccess,
  handleApiError
} from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { ensureModuleEnabled } from '@/lib/modules.server';
import { createInboxItem } from '@/lib/inbox';
import { isClientRole } from '@/lib/roles';

export async function processApprovePost({
  auth,
  spaceId,
  postId
}: {
  auth: Awaited<ReturnType<typeof requireAuth>>;
  spaceId: string;
  postId: string;
}) {
  requireTenantAccess(auth, spaceId);
  if (!isClientRole(auth.role)) {
    throw new Error('FORBIDDEN');
  }
  await ensureModuleEnabled(spaceId, 'social');

  const post = await prisma.post.findFirst({
    where: { id: postId, tenantId: spaceId },
    select: { id: true, title: true, status: true }
  });

  if (!post) {
    throw new Error('NOT_FOUND');
  }

  if (post.status !== 'pending_client') {
    throw new Error('INVALID_TRANSITION');
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      status: 'approved',
      updatedById: auth.userId
    }
  });

  await createInboxItem({
    spaceId,
    type: 'signal',
    title: 'Post approuvé',
    description: post.title,
    actionUrl: `/spaces/${spaceId}/social/posts/${post.id}`,
    entityKey: `post_approved:${spaceId}:${post.id}`,
    actorType: 'client'
  });

  return updated;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string; postId: string }> }
) {
  try {
    const auth = await requireAuth();
    await requireCsrfToken(req);
    const params = await context.params;
    const updated = await processApprovePost({
      auth,
      spaceId: params.spaceId,
      postId: params.postId
    });
    return NextResponse.json({ status: updated.status });
  } catch (error) {
    return handleApiError(error);
  }
}
