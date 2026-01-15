import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { networkSchema } from '@/lib/validators';
import { requireAuth, requireAgency, requireActiveTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    requireAgency(auth);
    await requireCsrfToken(req);

    await requireActiveTenantAccess(auth, resolvedParams.id);

    const form = await req.formData();
    const network = form.get('network')?.toString();
    const handle = form.get('handle')?.toString();
    const url = form.get('url')?.toString();

    const parsedNetwork = networkSchema.safeParse(network);
    if (!parsedNetwork.success) {
      return NextResponse.json({ error: 'invalid network' }, { status: 400 });
    }

    const channel = await prisma.tenantChannel.upsert({
      where: { tenantId_network: { tenantId: resolvedParams.id, network: parsedNetwork.data } },
      update: { handle: handle || null, url: url || null },
      create: {
        tenantId: resolvedParams.id,
        network: parsedNetwork.data,
        handle: handle || null,
        url: url || null
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: resolvedParams.id,
        action: 'tenant.channel.upsert',
        entityType: 'tenantChannel',
        entityId: channel.id,
        payload: { network: parsedNetwork.data, handle, url, userId: auth.userId }
      }
    });

    return NextResponse.redirect(new URL(`/spaces?tenantId=${resolvedParams.id}`, req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
