import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueDeleteRemote, enqueuePublish, enqueueSyncComments } from '@/lib/jobs';
import { buildIdempotencyKey } from '@/lib/workflow';
import { requireAuth, requireAgency, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  try {
    // Authenticate the user
    const auth = await requireAuth();
    requireAgency(auth);

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    // If tenantId is provided, verify access and filter by it
    if (tenantId) {
      requireTenantAccess(auth, tenantId);

      const jobs = await prisma.outboxJob.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return NextResponse.json(jobs);
    }

    // Otherwise, only return jobs for tenants the user has access to
    const jobs = await prisma.outboxJob.findMany({
      where: {
        tenantId: {
          in: auth.tenantIds
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(jobs);
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
    const type = form.get('type')?.toString();
    const postId = form.get('postId')?.toString();
    const tenantId = form.get('tenantId')?.toString();
    const provider = form.get('provider')?.toString();

    if (!type || !tenantId) {
      return NextResponse.json({ error: 'type and tenantId required' }, { status: 400 });
    }

    // Verify tenant access
    requireTenantAccess(auth, tenantId);

    if (type === 'publish' && postId && provider) {
      const post = await prisma.post.findUnique({ where: { id: postId } });

      if (!post) {
        throw new Error('NOT_FOUND');
      }

      // Verify the post belongs to the specified tenant
      if (post.tenantId !== tenantId) {
        throw new Error('FORBIDDEN');
      }

      const idempotencyKey = buildIdempotencyKey({
        postId,
        channelId: provider,
        scheduledAt: post.scheduledAt
      });

      const result = await prisma.$transaction(async (tx) => {
        const channel = await tx.postChannel.create({
          data: {
            postId,
            provider,
            idempotencyKey
          }
        });

        const outbox = await tx.outboxJob.create({
          data: {
            tenantId,
            type: 'publish',
            payload: { postId, channelId: channel.id, idempotencyKey }
          }
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'job.create',
            entityType: 'outboxJob',
            entityId: outbox.id,
            payload: { type: 'publish', postId, userId: auth.userId }
          }
        });

        return { channel, outbox };
      });

      await enqueuePublish({
        postId,
        channelId: result.channel.id,
        idempotencyKey: idempotencyKey,
        outboxJobId: result.outbox.id
      });

      return NextResponse.json({ ok: true, outboxId: result.outbox.id });
    }

    if (type === 'delete_remote' && postId && provider) {
      const channel = await prisma.postChannel.findFirst({
        where: { postId, provider },
        include: {
          post: {
            select: { tenantId: true }
          }
        }
      });

      if (!channel) {
        throw new Error('NOT_FOUND');
      }

      // Verify the post belongs to the specified tenant
      if (channel.post.tenantId !== tenantId) {
        throw new Error('FORBIDDEN');
      }

      const outbox = await prisma.$transaction(async (tx) => {
        const newOutbox = await tx.outboxJob.create({
          data: {
            tenantId,
            type: 'delete_remote',
            payload: { postChannelId: channel.id }
          }
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'job.create',
            entityType: 'outboxJob',
            entityId: newOutbox.id,
            payload: { type: 'delete_remote', postId, userId: auth.userId }
          }
        });

        return newOutbox;
      });

      await enqueueDeleteRemote({ postChannelId: channel.id, outboxJobId: outbox.id });

      return NextResponse.json({ ok: true, outboxId: outbox.id });
    }

    if (type === 'sync_comments') {
      const outbox = await prisma.$transaction(async (tx) => {
        const newOutbox = await tx.outboxJob.create({
          data: {
            tenantId,
            type: 'sync_comments',
            payload: { tenantId }
          }
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'job.create',
            entityType: 'outboxJob',
            entityId: newOutbox.id,
            payload: { type: 'sync_comments', userId: auth.userId }
          }
        });

        return newOutbox;
      });

      await enqueueSyncComments({ tenantId, outboxJobId: outbox.id });

      return NextResponse.json({ ok: true, outboxId: outbox.id });
    }

    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
