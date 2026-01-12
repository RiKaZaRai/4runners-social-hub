import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checklistSchema } from '@/lib/validators';

export async function POST(req: Request) {
  const form = await req.formData();
  const data = {
    postId: form.get('postId')?.toString(),
    label: form.get('label')?.toString(),
    checked: form.get('checked')?.toString() === 'true'
  };
  const tenantId = form.get('tenantId')?.toString();
  const parsed = checklistSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.checklistItem.create({
    data: {
      postId: parsed.data.postId,
      label: parsed.data.label,
      checked: parsed.data.checked ?? false
    }
  });

  const redirectUrl = tenantId
    ? `/posts/${parsed.data.postId}?tenantId=${tenantId}`
    : `/posts/${parsed.data.postId}`;
  return NextResponse.redirect(new URL(redirectUrl, req.url));
}

export async function PATCH(req: Request) {
  const form = await req.formData();
  const id = form.get('id')?.toString();
  const checked = form.get('checked')?.toString() === 'true';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const item = await prisma.checklistItem.update({
    where: { id },
    data: { checked }
  });
  return NextResponse.json(item);
}
