import { NextResponse } from 'next/server';
import { createPostSchema } from '@/lib/validators';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  const posts = await prisma.post.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const data = {
    tenantId: form.get('tenantId')?.toString(),
    title: form.get('title')?.toString(),
    body: form.get('body')?.toString()
  };

  const parsed = createPostSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      tenantId: parsed.data.tenantId,
      title: parsed.data.title,
      body: parsed.data.body
    }
  });

  await prisma.postVersion.create({
    data: {
      postId: post.id,
      title: post.title,
      body: post.body
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: post.tenantId,
      action: 'post.create',
      entityType: 'post',
      entityId: post.id,
      payload: { title: post.title }
    }
  });

  return NextResponse.redirect(new URL(`/posts/${post.id}?tenantId=${post.tenantId}`, req.url));
}
