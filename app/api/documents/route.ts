import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { isAgencyRole } from '@/lib/roles';
import type { Prisma } from '@prisma/client';

const DEFAULT_CONTENT: Prisma.InputJsonValue = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: []
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { tenantId, folderId, title } = body;

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Missing document title' }, { status: 400 });
    }

    // Wiki agence (tenantId = null): agency only
    if (tenantId === null || tenantId === undefined) {
      if (!isAgencyRole(user.role)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Client documents: check membership or agency role
      if (!isAgencyRole(user.role)) {
        const membership = await prisma.tenantMembership.findUnique({
          where: { tenantId_userId: { tenantId, userId: session.userId } }
        });
        if (!membership) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    }

    // Verify folder exists and belongs to same tenant if provided
    if (folderId) {
      const folder = await prisma.docFolder.findUnique({
        where: { id: folderId },
        select: { tenantId: true }
      });

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      // Ensure folder tenant matches document tenant
      const docTenantId = tenantId ?? null;
      if (folder.tenantId !== docTenantId) {
        return NextResponse.json({ error: 'Folder/tenant mismatch' }, { status: 400 });
      }
    }

    const document = await prisma.document.create({
      data: {
        tenantId: tenantId ?? null,
        folderId: folderId ?? null,
        title: title.trim(),
        content: DEFAULT_CONTENT,
        createdById: session.userId,
        updatedById: session.userId
      },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        isPublic: true,
        publicToken: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      ok: true,
      document: {
        ...document,
        content: JSON.parse(JSON.stringify(document.content)),
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
