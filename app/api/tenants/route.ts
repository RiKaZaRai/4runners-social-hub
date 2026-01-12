import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAuth, requireAgency, handleApiError } from '@/lib/api-auth';
import { requireCsrfToken } from '@/lib/csrf';
import { requireRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    await requireRateLimit(auth.userId, 'api');
    requireAgency(auth);
    await requireCsrfToken(req);

    const form = await req.formData();
    const name = form.get('name')?.toString();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: { name: name.trim() }
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: created.id,
          userId: auth.userId
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: created.id,
          action: 'tenant.create',
          entityType: 'tenant',
          entityId: created.id,
          payload: { name: created.name, userId: auth.userId }
        }
      });
      return created;
    });

    revalidatePath('/clients');
    revalidatePath('/posts');
    return NextResponse.redirect(new URL(`/clients?tenantId=${tenant.id}`, req.url));
  } catch (error) {
    return handleApiError(error);
  }
}
