import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updatePostSchema } from '@/lib/validators';
import { canTransition } from '@/lib/workflow';
import { enqueueDeleteRemote } from '@/lib/jobs';
import { requireAuth, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { isClientRole } from '@/lib/roles';

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Authenticate the user
    const auth = await requireAuth();

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    const post = await prisma.post.findUnique({ where: { id: params.id } });

    if (!post) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    requireTenantAccess(auth, post.tenantId);

    return NextResponse.json(post);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Authenticate the user
    const auth = await requireAuth();

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    // CSRF protection
    await requireCsrfToken(req);

    const existing = await prisma.post.findUnique({ where: { id: params.id } });

    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    requireTenantAccess(auth, existing.tenantId);

    const form = await req.formData();
    const data = {
      id: params.id,
      title: form.get('title')?.toString(),
      body: form.get('body')?.toString(),
      network: form.get('network')?.toString(),
      status: form.get('status')?.toString(),
      scheduledAt: form.get('scheduledAt')?.toString()
    };

    const parsed = updatePostSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (isClientRole(auth.role)) {
      const isUpdatingFields =
        parsed.data.title ||
        parsed.data.body ||
        parsed.data.network ||
        parsed.data.scheduledAt;
      const allowedStatuses = ['approved', 'changes_requested'];

      if (isUpdatingFields) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (parsed.data.status && !allowedStatuses.includes(parsed.data.status)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    if (parsed.data.status && !canTransition(existing.status, parsed.data.status)) {
      return NextResponse.json({ error: 'Invalid transition' }, { status: 400 });
    }

    // Use a transaction to ensure data consistency
    const updated = await prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
        where: { id: params.id },
        data: {
          title: parsed.data.title ?? undefined,
          body: parsed.data.body ?? undefined,
          network: parsed.data.network ?? undefined,
          status: parsed.data.status ?? undefined,
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined
        }
      });

      await tx.postVersion.create({
        data: {
          postId: updatedPost.id,
          title: updatedPost.title,
          body: updatedPost.body
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: updatedPost.tenantId,
          action: 'post.update',
          entityType: 'post',
          entityId: updatedPost.id,
          payload: {
            changes: {
              title: parsed.data.title,
              body: parsed.data.body,
              status: parsed.data.status
            },
            userId: auth.userId
          }
        }
      });

      return updatedPost;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Authenticate the user
    const auth = await requireAuth();
    if (isClientRole(auth.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    // CSRF protection (DELETE is a state-changing operation)
    await requireCsrfToken(req);

    const existing = await prisma.post.findUnique({ where: { id: params.id } });

    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    requireTenantAccess(auth, existing.tenantId);

    // Use a transaction for consistency
    const post = await prisma.$transaction(async (tx) => {
      const archivedPost = await tx.post.update({
        where: { id: params.id },
        data: { status: 'archived', archivedAt: new Date() }
      });

      await tx.auditLog.create({
        data: {
          tenantId: archivedPost.tenantId,
          action: 'post.delete',
          entityType: 'post',
          entityId: archivedPost.id,
          payload: { userId: auth.userId }
        }
      });

      return archivedPost;
    });

    // Enqueue remote deletion jobs
    const channels = await prisma.postChannel.findMany({ where: { postId: params.id } });
    await Promise.all(
      channels.map(async (channel) => {
        const outbox = await prisma.outboxJob.create({
          data: {
            tenantId: post.tenantId,
            type: 'delete_remote',
            payload: { postChannelId: channel.id }
          }
        });
        await enqueueDeleteRemote({ postChannelId: channel.id, outboxJobId: outbox.id });
      })
    );

    return NextResponse.json(post);
  } catch (error) {
    return handleApiError(error);
  }
}
