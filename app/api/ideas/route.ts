import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ideaSchema } from '@/lib/validators';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  const ideas = await prisma.idea.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(ideas);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const data = {
    tenantId: form.get('tenantId')?.toString(),
    title: form.get('title')?.toString(),
    description: form.get('description')?.toString()
  };
  const parsed = ideaSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const idea = await prisma.idea.create({
    data: parsed.data
  });

  return NextResponse.json(idea);
}

export async function PATCH(req: Request) {
  const form = await req.formData();
  const id = form.get('id')?.toString();
  const status = form.get('status')?.toString();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  const idea = await prisma.idea.update({
    where: { id },
    data: { status: status as any }
  });
  return NextResponse.json(idea);
}
