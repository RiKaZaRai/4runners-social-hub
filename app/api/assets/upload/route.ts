import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';
import { minioBucket, s3Client } from '@/lib/minio';

export async function POST(req: Request) {
  const form = await req.formData();
  const tenantId = form.get('tenantId')?.toString();
  const postId = form.get('postId')?.toString();
  const file = form.get('file');

  if (!tenantId || !file || !(file instanceof File)) {
    return NextResponse.json({ error: 'tenantId and file required' }, { status: 400 });
  }

  const filename = file.name || 'upload.bin';
  const key = `${tenantId}/${crypto.randomUUID()}-${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3Client.send(
    new PutObjectCommand({
      Bucket: minioBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream'
    })
  );

  const asset = await prisma.asset.create({
    data: {
      tenantId,
      postId: postId || null,
      key,
      url: '',
      contentType: file.type || 'application/octet-stream',
      size: buffer.length
    }
  });

  await prisma.asset.update({
    where: { id: asset.id },
    data: { url: `/api/assets/${asset.id}` }
  });

  return NextResponse.redirect(new URL(`/posts/${postId}?tenantId=${tenantId}`, req.url));
}
