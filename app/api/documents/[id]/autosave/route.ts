import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { isAgencyRole } from '@/lib/roles';
import type { Prisma } from '@prisma/client';

async function verifyDocumentAccess(docId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { tenantId: true }
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    const session = await requireSession();
    await verifyDocumentAccess(docId, session.userId);

    // Parse body as plain JSON
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing title or content' },
        { status: 400 }
      );
    }

    // Récupérer le document actuel pour créer une version
    const currentDoc = await prisma.document.findUnique({
      where: { id: docId },
      select: { title: true, content: true, tenantId: true }
    });

    if (!currentDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Créer une version snapshot (max 5 versions)
    const versionCount = await prisma.documentVersion.count({
      where: { documentId: docId }
    });

    if (versionCount >= 5) {
      const oldest = await prisma.documentVersion.findFirst({
        where: { documentId: docId },
        orderBy: { createdAt: 'asc' }
      });
      if (oldest) {
        await prisma.documentVersion.delete({ where: { id: oldest.id } });
      }
    }

    // Créer la nouvelle version
    await prisma.documentVersion.create({
      data: {
        documentId: docId,
        title: currentDoc.title,
        content: currentDoc.content as Prisma.InputJsonValue,
        createdById: session.userId
      }
    });

    // Mettre à jour le document
    const updated = await prisma.document.update({
      where: { id: docId },
      data: {
        title: title.trim(),
        content: content as Prisma.InputJsonValue,
        updatedById: session.userId
      }
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Autosave error:', error);

    if (error instanceof Error) {
      if (error.message === 'ACCESS_DENIED') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (error.message === 'DOCUMENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
