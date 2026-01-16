import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCsrfToken } from '@/lib/csrf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CsrfInput } from '@/components/csrf-input';
import {
  canCreateClients,
  isAgencyAdmin,
  isAgencyManager,
  isClientRole
} from '@/lib/roles';
import crypto from 'crypto';
import { TenantDeleteButton } from '@/components/tenant-delete-button';
import { TenantToggleButton } from '@/components/tenant-toggle-button';

export default async function SpacesPage({
  searchParams
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!currentUser || isClientRole(currentUser.role)) {
    redirect('/posts');
  }

  const resolvedSearchParams = await searchParams;
  const isAdmin = isAgencyAdmin(currentUser.role);
  const isManager = isAgencyManager(currentUser.role);

  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.userId },
    select: { tenantId: true }
  });

  const tenants = await prisma.tenant.findMany({
    where: isAdmin ? {} : { id: { in: memberships.map((m) => m.tenantId) } },
    orderBy: { createdAt: 'desc' },
    include: { channels: true }
  });

  const activeTenantId = resolvedSearchParams.tenantId ?? tenants[0]?.id;
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  async function createTenant(formData: FormData) {
    'use server';

    const session = await requireSession();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!currentUser || isClientRole(currentUser.role) || !canCreateClients(currentUser.role)) {
      redirect('/posts');
    }

    const name = formData.get('name')?.toString();
    if (!name || name.trim().length < 2) {
      redirect('/spaces?error=name_required');
    }

    const formToken = formData.get('csrf_token')?.toString();
    const cookieToken = await getCsrfToken();
    if (!formToken || !cookieToken || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(formToken))) {
      redirect('/spaces?error=csrf');
    }

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: name.trim() }
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId,
          role: 'viewer'
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: 'tenant.create',
          entityType: 'tenant',
          entityId: tenant.id,
          payload: { name: tenant.name, userId: session.userId }
        }
      });

      return tenant;
    });

    revalidatePath('/spaces');
    revalidatePath('/spaces', 'layout');
    revalidatePath('/home');
    revalidatePath('/posts');
    redirect(`/spaces/${created.id}/overview`);
  }

  async function deleteTenant(tenantId: string) {
    'use server';

    const session = await requireSession();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!currentUser || !isAgencyAdmin(currentUser.role)) {
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

    revalidatePath('/spaces');
    revalidatePath('/spaces', 'layout');
    revalidatePath('/home');
    revalidatePath('/posts');
  }

  async function toggleTenantActive(tenantId: string, active: boolean) {
    'use server';

    const session = await requireSession();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!currentUser || !isAgencyAdmin(currentUser.role)) {
      redirect('/posts');
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { active }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: session.userId,
        action: active ? 'tenant.activate' : 'tenant.deactivate',
        entityType: 'tenant',
        entityId: tenantId,
        payload: { active }
      }
    });

    revalidatePath('/spaces');
    revalidatePath('/spaces', 'layout');
    revalidatePath('/home');
    revalidatePath('/posts');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gestion</p>
        <h2 className="text-2xl font-semibold">Espaces</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerez vos espaces et leurs reseaux sociaux associes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nouvel espace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canCreateClients(currentUser.role) ? (
              <form action={createTenant} className="space-y-3">
                <CsrfInput />
                <Input name="name" placeholder="Nom de l'espace" required />
                <Button type="submit">Creer</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas l'autorisation de creer un espace.
              </p>
            )}
            <div className="space-y-2 text-sm">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition ${
                    tenant.id === activeTenantId ? 'bg-muted/70' : 'hover:bg-muted'
                  } ${!tenant.active ? 'opacity-60' : ''}`}
                >
                  <Link
                    href={`/spaces?tenantId=${tenant.id}`}
                    className="min-w-0 flex-1 truncate text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {tenant.name}
                      {!tenant.active && (
                        <Badge variant="default" className="text-xs">
                          Inactif
                        </Badge>
                      )}
                    </span>
                  </Link>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <TenantToggleButton
                        tenantId={tenant.id}
                        tenantName={tenant.name}
                        active={tenant.active}
                        onToggle={toggleTenantActive}
                      />
                      <TenantDeleteButton
                        tenantId={tenant.id}
                        tenantName={tenant.name}
                        onDelete={deleteTenant}
                      />
                    </div>
                  )}
                </div>
              ))}
              {tenants.length === 0 && (
                <p className="text-muted-foreground">Aucun espace pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reseaux de l'espace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTenant ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{activeTenant.name}</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/spaces/${activeTenant.id}/overview`}>
                        Voir l'espace
                      </Link>
                    </Button>
                    {(isAdmin || isManager) && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/spaces/${activeTenant.id}/settings`}>
                          Paramètres
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
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

                {isAdmin || isManager ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Les reseaux sont gerables par l'agence uniquement.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selectionnez un espace.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
