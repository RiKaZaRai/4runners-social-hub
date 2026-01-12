import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { networkSchema } from '@/lib/validators';
import { requireAuth, requireAgency, requireTenantAccess, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    requireAgency(auth);
    await requireCsrfToken(req);

    const params = await context.params;
    requireTenantAccess(auth, params.id);

    const form = await req.formData();
    const network = form.get('network')?.toString();
    const handle = form.get('handle')?.toString();
    const url = form.get('url')?.toString();

    const parsedNetwork = networkSchema.safeParse(network);
    if (!parsedNetwork.success) {
      return NextResponse.json({ error: 'invalid network' }, { status: 400 });
    }

    const channel = await prisma.tenantChannel.upsert({
      where: { tenantId_network: { tenantId: params.id, network: parsedNetwork.data } },
      update: { handle: handle || null, url: url || null },
      create: {
        tenantId: params.id,
        network: parsedNetwork.data,
        handle: handle || null,
        url: url || null
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: params.id,
        action: 'tenant.channel.upsert',
        entityType: 'tenantChannel',
        entityId: channel.id,
        payload: { network: parsedNetwork.data, handle, url, userId: auth.userId }
      }
    });

    return NextResponse.redirect(new URL(`/clients?tenantId=${params.id}`, req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
