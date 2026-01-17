import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { isAgencyRole } from '@/lib/roles';

async function verifyDocumentAccess(docId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { id: true, title: true, tenantId: true }
  });

  if (!doc) throw new Error('DOCUMENT_NOT_FOUND');

  // Wiki agence: agence uniquement
  if (doc.tenantId === null) {
    if (!isAgencyRole(user.role)) {
      throw new Error('ACCESS_DENIED');
    }
    return { doc, user, isWiki: true };
  }

  // Documents client: vérifier membership ou agence
  if (!isAgencyRole(user.role)) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: doc.tenantId, userId } }
    });
    if (!membership) throw new Error('ACCESS_DENIED');
  }

  return { doc, user, isWiki: false };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const docId = (await params).id;
    const session = await requireSession();
    const { doc } = await verifyDocumentAccess(docId, session.userId);

    // Delete all versions first (cascade should handle this, but being explicit)
    await prisma.documentVersion.deleteMany({
      where: { documentId: docId }
    });

    // Delete the document
    await prisma.document.delete({
      where: { id: docId }
    });

    // Revalidate cached pages
    if (doc.tenantId) {
      revalidatePath(`/spaces/${doc.tenantId}/docs`);
    } else {
      revalidatePath('/wiki');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete document error:', error);

    if (error instanceof Error) {
      if (error.message === 'ACCESS_DENIED') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (error.message === 'DOCUMENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
