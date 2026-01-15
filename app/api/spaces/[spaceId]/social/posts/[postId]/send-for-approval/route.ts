import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAuth,
  requireTenantAccess,
  requireAgency,
  handleApiError
} from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { ensureModuleEnabled } from '@/lib/modules';
import { createInboxItem } from '@/lib/inbox';
import { PostStatus } from '@prisma/client';

const ALLOWED_FROM: PostStatus[] = ['draft', 'changes_requested'];

export async function processSendForApproval({
  auth,
  spaceId,
  postId
}: {
  auth: Awaited<ReturnType<typeof requireAuth>>;
  spaceId: string;
  postId: string;
}) {
  requireTenantAccess(auth, spaceId);
  requireAgency(auth);
  await ensureModuleEnabled(spaceId, 'social');

  const post = await prisma.post.findFirst({
    where: { id: postId, tenantId: spaceId },
    select: { id: true, title: true, body: true, status: true }
  });

  if (!post) {
    throw new Error('NOT_FOUND');
  }

  if (!ALLOWED_FROM.includes(post.status)) {
    throw new Error('INVALID_TRANSITION');
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      status: 'pending_client',
      updatedById: auth.userId
    }
  });

  await createInboxItem({
    spaceId,
    type: 'validation',
    title: 'Post à valider',
    description: post.title,
    actionUrl: `/spaces/${spaceId}/social/posts/${post.id}`,
    entityKey: `post_validation:${spaceId}:${post.id}`,
    actorType: 'agency'
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
    const updated = await processSendForApproval({
      auth,
      spaceId: params.spaceId,
      postId: params.postId
    });
    return NextResponse.json({ status: updated.status });
  } catch (error) {
    return handleApiError(error);
  }
}
