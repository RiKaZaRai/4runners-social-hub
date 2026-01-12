import { NextResponse } from 'next/server';
import { PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';
import { minioBucket, s3Client } from '@/lib/minio';
import { requireAuth, requireAgency, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import {
  validateFile,
  verifyFileSignature,
  generateStorageKey,
  sanitizeFilename
} from '@/lib/file-validation';

export async function POST(req: Request) {
  try {
    // Authenticate the user
    const auth = await requireAuth();
    requireAgency(auth);

    // Rate limiting (stricter for uploads)
    await requireRateLimit(auth.userId, 'upload');

    // CSRF protection
    await requireCsrfToken(req);

    const form = await req.formData();
    const tenantId = form.get('tenantId')?.toString();
    const postId = form.get('postId')?.toString();
    const file = form.get('file');

    if (!tenantId) {
      throw new Error('TENANT_REQUIRED');
    }

    // Verify tenant access
    requireTenantAccess(auth, tenantId);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Verify file signature matches declared type
    const signatureCheck = await verifyFileSignature(file);
    if (!signatureCheck.valid) {
      return NextResponse.json({ error: signatureCheck.error }, { status: 400 });
    }

    // Generate secure storage key with sanitized filename
    const key = generateStorageKey(tenantId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3/MinIO
    try {
      const putParams: PutObjectCommandInput = {
        Bucket: minioBucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Add security headers
        ContentDisposition: `attachment; filename="${sanitizeFilename(file.name)}"`
      };

      if (process.env.MINIO_SSE === 'true') {
        putParams.ServerSideEncryption = 'AES256';
      }

      await s3Client.send(new PutObjectCommand(putParams));
    } catch (error) {
      console.error('S3 upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Use transaction to create asset and audit log
    const asset = await prisma.$transaction(async (tx) => {
      const newAsset = await tx.asset.create({
        data: {
          tenantId,
          postId: postId || null,
          key,
          url: '',
          contentType: file.type,
          size: buffer.length
        }
      });

      const updatedAsset = await tx.asset.update({
        where: { id: newAsset.id },
        data: { url: `/api/assets/${newAsset.id}` }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'asset.upload',
          entityType: 'asset',
          entityId: updatedAsset.id,
          payload: {
            filename: sanitizeFilename(file.name),
            size: buffer.length,
            contentType: file.type,
            userId: auth.userId
          }
        }
      });

      return updatedAsset;
    });

    if (postId) {
      return NextResponse.redirect(
        new URL(`/posts?tenantId=${tenantId}&postId=${postId}`, req.url)
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    return handleApiError(error);
  }
}
