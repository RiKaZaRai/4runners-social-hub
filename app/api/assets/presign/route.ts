import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { presignSchema } from '@/lib/validators';
import { minioBucket, s3Client } from '@/lib/minio';

export async function POST(req: Request) {
  const form = await req.formData();
  const data = {
    tenantId: form.get('tenantId')?.toString(),
    filename: form.get('filename')?.toString(),
    contentType: form.get('contentType')?.toString()
  };
  const postId = form.get('postId')?.toString();

  const parsed = presignSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const key = `${parsed.data.tenantId}/${crypto.randomUUID()}-${parsed.data.filename}`;

  const command = new PutObjectCommand({
    Bucket: minioBucket,
    Key: key,
    ContentType: parsed.data.contentType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  const publicUrl = `${process.env.MINIO_ENDPOINT}/${minioBucket}/${key}`;

  await prisma.asset.create({
    data: {
      tenantId: parsed.data.tenantId,
      postId: postId || null,
      key,
      url: publicUrl,
      contentType: parsed.data.contentType,
      size: 0
    }
  });

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
