import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updatePostSchema } from '@/lib/validators';
import { canTransition } from '@/lib/workflow';
import { enqueueDeleteRemote } from '@/lib/jobs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const data = {
    id: params.id,
    title: form.get('title')?.toString(),
    body: form.get('body')?.toString(),
    status: form.get('status')?.toString(),
    scheduledAt: form.get('scheduledAt')?.toString()
  };

  const parsed = updatePostSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.status && !canTransition(existing.status, parsed.data.status)) {
    return NextResponse.json({ error: 'Invalid transition' }, { status: 400 });
  }

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: {
      title: parsed.data.title ?? undefined,
      body: parsed.data.body ?? undefined,
      status: parsed.data.status ?? undefined,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined
    }
  });

  await prisma.postVersion.create({
    data: {
      postId: updated.id,
      title: updated.title,
      body: updated.body
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const post = await prisma.post.update({
    where: { id: params.id },
    data: { status: 'archived', archivedAt: new Date() }
  });
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
}
