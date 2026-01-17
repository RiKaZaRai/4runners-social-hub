import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { isAgencyRole } from '@/lib/roles';

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
    const { tenantId, parentId, name } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });
    }

    // Wiki agence (tenantId = null): agency only
    if (tenantId === null || tenantId === undefined) {
      if (!isAgencyRole(user.role)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Client folders: check membership or agency role
      if (!isAgencyRole(user.role)) {
        const membership = await prisma.tenantMembership.findUnique({
          where: { tenantId_userId: { tenantId, userId: session.userId } }
        });
        if (!membership) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    }

    // Get max sortOrder for siblings
    const maxSort = await prisma.docFolder.aggregate({
      where: { tenantId: tenantId ?? null, parentId: parentId ?? null },
      _max: { sortOrder: true }
    });

    const folder = await prisma.docFolder.create({
      data: {
        tenantId: tenantId ?? null,
        parentId: parentId ?? null,
        name: name.trim(),
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        parentId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      ok: true,
      folder: {
        ...folder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
