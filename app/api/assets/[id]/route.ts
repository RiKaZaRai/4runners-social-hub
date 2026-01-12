import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { prisma } from '@/lib/db';
import { minioBucket, s3Client } from '@/lib/minio';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = await s3Client.send(
    new GetObjectCommand({
      Bucket: minioBucket,
      Key: asset.key
    })
  );

  if (!data.Body) {
    return NextResponse.json({ error: 'Empty body' }, { status: 404 });
  }

  const stream = Readable.toWeb(data.Body as Readable);
  return new Response(stream, {
    headers: {
      'Content-Type': asset.contentType,
      'Content-Disposition': `inline; filename="${asset.key.split('/').pop()}"`
    }
  });
}
