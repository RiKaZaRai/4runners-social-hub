import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCsrfToken } from '@/lib/csrf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CsrfInput } from '@/components/csrf-input';
import crypto from 'crypto';
import { TenantDeleteButton } from '@/components/tenant-delete-button';

export default async function ClientsPage({
  searchParams
}: {
  searchParams: { tenantId?: string };
}) {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!currentUser || currentUser.role === 'client') {
    redirect('/posts');
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { channels: true }
  });

  const activeTenantId = searchParams.tenantId ?? tenants[0]?.id;
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  async function createTenant(formData: FormData) {
    'use server';

    const session = await requireSession();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!currentUser || currentUser.role === 'client') {
      redirect('/posts');
    }

    const name = formData.get('name')?.toString();
    if (!name || name.trim().length < 2) {
      redirect('/clients?error=name_required');
    }

    const formToken = formData.get('csrf_token')?.toString();
    const cookieToken = await getCsrfToken();
    if (!formToken || !cookieToken || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(formToken))) {
      redirect('/clients?error=csrf');
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: { name: name.trim() }
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: created.id,
          userId: session.userId,
          role: 'client_admin'
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: created.id,
          action: 'tenant.create',
          entityType: 'tenant',
          entityId: created.id,
          payload: { name: created.name, userId: session.userId }
        }
      });

    });

    revalidatePath('/clients');
    revalidatePath('/clients', 'layout');
    revalidatePath('/home');
    revalidatePath('/home', 'layout');
    revalidatePath('/posts');
    return;
  }

  async function deleteTenant(tenantId: string) {
    'use server';

    const session = await requireSession();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!currentUser || currentUser.role === 'client') {
      redirect('/posts');
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({
        where: { post: { tenantId } }
      });
      await tx.checklistItem.deleteMany({
        where: { post: { tenantId } }
      });
      await tx.postVersion.deleteMany({
        where: { post: { tenantId } }
      });
      await tx.postChannel.deleteMany({
        where: { post: { tenantId } }
      });
      await tx.asset.deleteMany({
        where: { tenantId }
      });
      await tx.post.deleteMany({
        where: { tenantId }
      });
      await tx.idea.deleteMany({
        where: { tenantId }
      });
      await tx.tenantChannel.deleteMany({
        where: { tenantId }
      });
      await tx.outboxJob.deleteMany({
        where: { tenantId }
      });
      await tx.auditLog.deleteMany({
        where: { tenantId }
      });
      await tx.tenantMembership.deleteMany({
        where: { tenantId }
      });
      await tx.tenant.delete({
        where: { id: tenantId }
      });
    });

    revalidatePath('/clients');
    revalidatePath('/clients', 'layout');
    revalidatePath('/home');
    revalidatePath('/home', 'layout');
    revalidatePath('/posts');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clients</p>
        <h2 className="text-2xl font-semibold">Dossiers clients</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Creez un dossier client puis ajoutez les reseaux associes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createTenant} className="space-y-3">
              <CsrfInput />
              <Input name="name" placeholder="Nom du client" required />
              <Button type="submit">Creer</Button>
            </form>
            <div className="space-y-2 text-sm">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition ${
                    tenant.id === activeTenantId ? 'bg-muted/70' : 'hover:bg-muted'
                  }`}
                >
                  <a
                    href={`/clients?tenantId=${tenant.id}`}
                    className="min-w-0 flex-1 truncate text-sm"
                  >
                    {tenant.name}
                  </a>
                  <TenantDeleteButton
                    tenantId={tenant.id}
                    tenantName={tenant.name}
                    onDelete={deleteTenant}
                  />
                </div>
              ))}
              {tenants.length === 0 && (
                <p className="text-muted-foreground">Aucun client pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reseaux du client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTenant ? (
              <>
                <div className="grid gap-3">
                  {activeTenant.channels.map((channel) => (
                    <div key={channel.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="font-medium uppercase">{channel.network}</div>
                      <div className="text-muted-foreground">{channel.handle || 'Sans handle'}</div>
                      {channel.url && (
                        <a className="text-primary hover:underline" href={channel.url}>
                          {channel.url}
                        </a>
                      )}
                    </div>
                  ))}
                  {activeTenant.channels.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun reseau associe.</p>
                  )}
                </div>

                <form
                  action={`/api/tenants/${activeTenant.id}/channels`}
                  method="post"
                  className="space-y-3"
                >
                  <CsrfInput />
                  <label className="block text-sm text-muted-foreground">Reseau</label>
                  <select
                    name="network"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    defaultValue="linkedin"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="x">X</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                  <Input name="handle" placeholder="@handle" />
                  <Input name="url" placeholder="URL du profil" />
                  <Button type="submit">Ajouter / Mettre a jour</Button>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selectionnez un client.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
