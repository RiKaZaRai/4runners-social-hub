import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  requireAuth,
  requireTenantAccess,
  handleApiError
} from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { ensureModuleEnabled } from '@/lib/modules';
import { createInboxItem } from '@/lib/inbox';
import { CommentRole } from '@prisma/client';
import { isClientRole } from '@/lib/roles';

const requestChangesSchema = z.object({
  comment: z.string().min(5).max(2000)
});

export async function processRequestChanges({
  auth,
  spaceId,
  postId,
  payload
}: {
  auth: Awaited<ReturnType<typeof requireAuth>>;
  spaceId: string;
  postId: string;
  payload: z.infer<typeof requestChangesSchema>;
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

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      body: payload.comment.trim(),
      authorRole: CommentRole.client
    }
  });

  await createInboxItem({
    spaceId,
    type: 'message',
    title: 'Commentaire client sur post',
    description: payload.comment,
    actionUrl: `/spaces/${spaceId}/social/posts/${post.id}`,
    entityKey: `post_thread:${spaceId}:${post.id}`,
    actorType: 'client'
  });

  return { comment };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string; postId: string }> }
) {
  try {
    const auth = await requireAuth();
    await requireCsrfToken(req);
    const body = await req.json();
    const parsed = requestChangesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Commentaires invalides' }, { status: 400 });
    }
    const params = await context.params;
    const result = await processRequestChanges({
      auth,
      spaceId: params.spaceId,
      postId: params.postId,
      payload: parsed.data
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
