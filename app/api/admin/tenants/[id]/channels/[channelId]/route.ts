import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { requireCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    // Verify session
    const session = await requireSession();

    // CSRF protection
    await requireCsrfToken(req);

    // Verify user is agency_admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (user?.role !== 'agency_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { handle, url } = body;

    // Verify channel belongs to the tenant
    const existingChannel = await prisma.tenantChannel.findUnique({
      where: { id: params.channelId }
    });

    if (!existingChannel || existingChannel.tenantId !== params.id) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Update channel
    const channel = await prisma.tenantChannel.update({
      where: { id: params.channelId },
      data: {
        handle: handle !== undefined ? handle || null : undefined,
        url: url !== undefined ? url || null : undefined
      }
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error updating channel:', error);

    // Handle not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    // Verify session
    const session = await requireSession();

    // CSRF protection
    await requireCsrfToken(req);

    // Verify user is agency_admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (user?.role !== 'agency_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify channel belongs to the tenant
    const existingChannel = await prisma.tenantChannel.findUnique({
      where: { id: params.channelId }
    });

    if (!existingChannel || existingChannel.tenantId !== params.id) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Delete channel
    await prisma.tenantChannel.delete({
      where: { id: params.channelId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting channel:', error);

    // Handle not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
