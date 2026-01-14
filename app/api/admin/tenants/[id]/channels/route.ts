import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { isAgencyAdmin, isAgencyManager, isAgencyProduction, isClientRole } from '@/lib/roles';

const VALID_NETWORKS = [
  'instagram',
  'facebook',
  'linkedin',
  'x',
  'tiktok',
  'youtube',
  'wordpress',
  'google_my_business'
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify session
    const session = await requireSession();

    // CSRF protection
    await requireCsrfToken(req);

    // Verify user access
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || isAgencyProduction(user.role) || isClientRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (isAgencyManager(user.role)) {
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: id, userId: session.userId } }
      });
      if (!membership) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (!isAgencyAdmin(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { network, handle, url } = body;

    if (!network) {
      return NextResponse.json({ error: 'network is required' }, { status: 400 });
    }

    if (!VALID_NETWORKS.includes(network)) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Create channel
    const channel = await prisma.tenantChannel.create({
      data: {
        tenantId: id,
        network,
        handle: handle || null,
        url: url || null
      }
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Error adding channel:', error);

    // Handle unique constraint violation (network already added)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Network already added for this tenant' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
