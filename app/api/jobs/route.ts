import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueDeleteRemote, enqueuePublish, enqueueSyncComments } from '@/lib/jobs';
import { buildIdempotencyKey } from '@/lib/workflow';

export async function GET() {
  const jobs = await prisma.outboxJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const type = form.get('type')?.toString();
  const postId = form.get('postId')?.toString();
  const tenantId = form.get('tenantId')?.toString();
  const provider = form.get('provider')?.toString();

  if (!type || !tenantId) {
    return NextResponse.json({ error: 'type and tenantId required' }, { status: 400 });
  }

  if (type === 'publish' && postId && provider) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });
    const idempotencyKey = buildIdempotencyKey({
      postId,
      channelId: provider,
      scheduledAt: post.scheduledAt
    });
    const channel = await prisma.postChannel.create({
      data: {
        postId,
        provider,
        idempotencyKey
      }
    });

    const outbox = await prisma.outboxJob.create({
      data: {
        tenantId,
        type: 'publish',
        payload: { postId, channelId: channel.id, idempotencyKey }
      }
    });

    await enqueuePublish({ postId, channelId: channel.id, idempotencyKey: idempotencyKey, outboxJobId: outbox.id });
    return NextResponse.json({ ok: true, outboxId: outbox.id });
  }

  if (type === 'delete_remote' && postId && provider) {
    const channel = await prisma.postChannel.findFirst({
      where: { postId, provider }
    });
    if (!channel) return NextResponse.json({ error: 'channel not found' }, { status: 404 });

    const outbox = await prisma.outboxJob.create({
      data: {
        tenantId,
        type: 'delete_remote',
        payload: { postChannelId: channel.id }
      }
    });

    await enqueueDeleteRemote({ postChannelId: channel.id, outboxJobId: outbox.id });
    return NextResponse.json({ ok: true, outboxId: outbox.id });
  }

  if (type === 'sync_comments') {
    const outbox = await prisma.outboxJob.create({
      data: {
        tenantId,
        type: 'sync_comments',
        payload: { tenantId }
      }
    });

    await enqueueSyncComments({ tenantId, outboxJobId: outbox.id });
    return NextResponse.json({ ok: true, outboxId: outbox.id });
  }

  return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
}
