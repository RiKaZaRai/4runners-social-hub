import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueDeleteRemote, enqueuePublish, enqueueSyncComments } from '@/lib/jobs';
import { requireAuth, requireAgency, requireActiveTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

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
    const jobId = form.get('jobId')?.toString();

    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const outbox = await prisma.outboxJob.findUnique({ where: { id: jobId } });

    if (!outbox) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    await requireActiveTenantAccess(auth, outbox.tenantId);

    await prisma.$transaction(async (tx) => {
      await tx.outboxJob.update({
        where: { id: outbox.id },
        data: { status: 'queued', attempts: { increment: 1 }, lastError: null }
      });

      await tx.auditLog.create({
        data: {
          tenantId: outbox.tenantId,
          action: 'job.retry',
          entityType: 'outboxJob',
          entityId: outbox.id,
          payload: { userId: auth.userId }
        }
      });
    });

    const payload = { ...(outbox.payload as any), outboxJobId: outbox.id };

    if (outbox.type === 'publish') {
      await enqueuePublish(payload);
    } else if (outbox.type === 'delete_remote') {
      await enqueueDeleteRemote(payload);
    } else if (outbox.type === 'sync_comments') {
      await enqueueSyncComments(payload);
    }

    return NextResponse.redirect(new URL('/jobs', req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
