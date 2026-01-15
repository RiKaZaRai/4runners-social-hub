import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import type { InboxStatus } from '@prisma/client';

const ALLOWED_STATUSES: InboxStatus[] = ['open', 'done', 'blocked'];
const CLIENT_ALLOWED_STATUSES: InboxStatus[] = ['open', 'done'];

function redirectWithError(req: NextRequest, error: string) {
  const referer = req.headers.get('referer');
  const url = referer ? new URL(referer) : new URL('/inbox', req.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    await requireCsrfToken(req);

    const params = await context.params;
    const form = await req.formData();
    const status = form.get('status')?.toString() as InboxStatus | undefined;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const item = await prisma.inboxItem.findUnique({
      where: { id: params.id },
      select: { id: true, spaceId: true }
    });

    if (!item) {
      throw new Error('NOT_FOUND');
    }

    if (isClientRole(auth.role)) {
      if (!auth.tenantIds.includes(item.spaceId)) {
        return redirectWithError(req, 'forbidden');
      }
      if (!CLIENT_ALLOWED_STATUSES.includes(status)) {
        return redirectWithError(req, 'forbidden');
      }
    } else if (!isAgencyRole(auth.role)) {
      return redirectWithError(req, 'forbidden');
    }

    await prisma.inboxItem.update({
      where: { id: item.id },
      data: { status }
    });

    return NextResponse.redirect(new URL('/inbox', req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
