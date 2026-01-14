import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';
import { minioBucket, s3Client } from '@/lib/minio';
import { requireAuth, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireRateLimit } from '@/lib/rate-limit';
import { sanitizeFilename } from '@/lib/file-validation';

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // Authenticate the user
    const auth = await requireAuth();

    // Rate limiting
    await requireRateLimit(auth.userId, 'api');

    const asset = await prisma.asset.findUnique({ where: { id: params.id } });

    if (!asset) {
      throw new Error('NOT_FOUND');
    }

    // Verify tenant access
    requireTenantAccess(auth, asset.tenantId);

    // Fetch from S3/MinIO
    let data;
    try {
      data = await s3Client.send(
        new GetObjectCommand({
          Bucket: minioBucket,
          Key: asset.key
        })
      );
    } catch (error) {
      console.error('S3 fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch file from storage' }, { status: 500 });
    }

    if (!data.Body) {
      return NextResponse.json({ error: 'Empty body' }, { status: 404 });
    }

    const body = data.Body as unknown as BodyInit;

    // Extract and sanitize filename
    const originalFilename = asset.key.split('/').pop() || 'download';
    const sanitizedFilename = sanitizeFilename(originalFilename);

    // Security headers to prevent XSS
    const headers: Record<string, string> = {
      'Content-Type': asset.contentType,
      // Force download instead of inline display to prevent XSS
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'X-Frame-Options': 'DENY'
    };

    // Only allow inline display for safe image types
    const safeInlineTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (safeInlineTypes.includes(asset.contentType)) {
      headers['Content-Disposition'] = `inline; filename="${sanitizedFilename}"`;
    }

    return new Response(body, { headers });
  } catch (error) {
    return handleApiError(error);
  }
}
