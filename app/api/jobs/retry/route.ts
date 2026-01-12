import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueDeleteRemote, enqueuePublish, enqueueSyncComments } from '@/lib/jobs';

export async function POST(req: Request) {
  const form = await req.formData();
  const jobId = form.get('jobId')?.toString();
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  const outbox = await prisma.outboxJob.findUnique({ where: { id: jobId } });
  if (!outbox) return NextResponse.json({ error: 'job not found' }, { status: 404 });

  await prisma.outboxJob.update({
    where: { id: outbox.id },
    data: { status: 'queued', attempts: { increment: 1 }, lastError: null }
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
}
