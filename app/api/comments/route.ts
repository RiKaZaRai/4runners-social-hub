import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { commentSchema } from '@/lib/validators';

export async function POST(req: Request) {
  const form = await req.formData();
  const data = {
    postId: form.get('postId')?.toString(),
    body: form.get('body')?.toString(),
    authorRole: form.get('authorRole')?.toString()
  };
  const tenantId = form.get('tenantId')?.toString();

  const parsed = commentSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const comment = await prisma.comment.create({
    data: {
      postId: parsed.data.postId,
      body: parsed.data.body,
      authorRole: parsed.data.authorRole
    }
  });

  const redirectUrl = tenantId
    ? `/posts/${comment.postId}?tenantId=${tenantId}`
    : `/posts/${comment.postId}`;
  return NextResponse.redirect(new URL(redirectUrl, req.url));
}
