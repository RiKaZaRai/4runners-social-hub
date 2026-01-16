import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  isAgencyAdmin,
  isAgencyManager,
  isAgencyProduction,
  isClientRole
} from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default async function TenantMembersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const session = await requireSession();

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser || isAgencyProduction(currentUser.role) || isClientRole(currentUser.role)) {
    redirect('/spaces');
  }

  const isAdmin = isAgencyAdmin(currentUser.role);
  const isManager = isAgencyManager(currentUser.role);
  const managerMembership = isManager
    ? await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: session.userId } }
      })
    : null;

  if (!isAdmin && !managerMembership) {
    redirect('/spaces');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) {
    notFound();
  }

  const allUsers = await prisma.user.findMany({
    where: { role: { in: ['client_admin', 'client_user'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true
    },
    orderBy: { email: 'asc' }
  });

  const availableUsers = allUsers.filter(
    (u) => !tenant.memberships.some((m) => m.userId === u.id)
  );

  async function addMember(formData: FormData) {
    'use server';

    const tid = formData.get('tenantId') as string;
    const session = await requireSession();
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!actor || isAgencyProduction(actor.role) || isClientRole(actor.role)) {
      redirect('/spaces');
    }

    const actorIsAdmin = isAgencyAdmin(actor.role);
    const actorIsManager = isAgencyManager(actor.role);

    if (!actorIsAdmin) {
      if (!actorIsManager) redirect('/spaces');
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: tid, userId: session.userId } }
      });
      if (!membership) redirect('/spaces');
    }

    const userId = formData.get('userId') as string;
    const role = formData.get('role') as 'viewer' | 'client_admin';

    if (!userId || !role) {
      redirect(`/admin/${tid}/members?error=missing_fields`);
    }

    try {
      await prisma.tenantMembership.create({
        data: {
          tenantId: tid,
          userId,
          role
        }
      });

      redirect(`/admin/${tid}/members`);
    } catch (error) {
      console.error('Error adding member:', error);
      redirect(`/admin/${tid}/members?error=add_failed`);
    }
  }

  async function removeMember(formData: FormData) {
    'use server';

    const tid = formData.get('tenantId') as string;
    const session = await requireSession();
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!actor || !isAgencyAdmin(actor.role)) {
      redirect('/spaces');
    }

    const membershipId = formData.get('membershipId') as string;

    if (!membershipId) {
      redirect(`/admin/${tid}/members?error=missing_id`);
    }

    try {
      const membership = await prisma.tenantMembership.findUnique({
        where: { id: membershipId },
        select: { userId: true, tenantId: true }
      });

      if (!membership || membership.tenantId !== tid) {
        redirect(`/admin/${tid}/members?error=not_found`);
      }

      if (membership.userId === session.userId) {
        redirect(`/admin/${tid}/members?error=cannot_remove_self`);
      }

      await prisma.tenantMembership.delete({
        where: { id: membershipId }
      });

      redirect(`/admin/${tid}/members`);
    } catch (error) {
      console.error('Error removing member:', error);
      redirect(`/admin/${tid}/members?error=remove_failed`);
    }
  }

  async function updateMemberRole(formData: FormData) {
    'use server';

    const tid = formData.get('tenantId') as string;
    const session = await requireSession();
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!actor || isAgencyProduction(actor.role) || isClientRole(actor.role)) {
      redirect('/spaces');
    }

    const actorIsAdmin = isAgencyAdmin(actor.role);
    const actorIsManager = isAgencyManager(actor.role);

    if (!actorIsAdmin) {
      if (!actorIsManager) redirect('/spaces');
      const membership = await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: tid, userId: session.userId } }
      });
      if (!membership) redirect('/spaces');
    }

    const membershipId = formData.get('membershipId') as string;
    const role = formData.get('role') as 'viewer' | 'client_admin';

    if (!membershipId || !role) {
      redirect(`/admin/${tid}/members?error=missing_fields`);
    }

    try {
      const membership = await prisma.tenantMembership.findUnique({
        where: { id: membershipId },
        select: { tenantId: true }
      });

      if (!membership || membership.tenantId !== tid) {
        redirect(`/admin/${tid}/members?error=not_found`);
      }

      await prisma.tenantMembership.update({
        where: { id: membershipId },
        data: { role }
      });

      redirect(`/admin/${tid}/members`);
    } catch (error) {
      console.error('Error updating member role:', error);
      redirect(`/admin/${tid}/members?error=update_failed`);
    }
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            href={`/admin/${tenantId}`}
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au client
          </Link>
          <h1 className="text-3xl font-semibold">Gérer les membres</h1>
          <p className="mt-1 text-sm text-muted-foreground">Membres de {tenant.name}</p>
        </div>

        {availableUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un membre</CardTitle>
              <CardDescription>
                Ajouter un utilisateur à ce client avec un rôle spécifique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addMember} className="space-y-4">
                <input type="hidden" name="tenantId" value={tenantId} />
                <div className="space-y-2">
                  <Label htmlFor="userId">Utilisateur</Label>
                  <select
                    id="userId"
                    name="userId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Sélectionnez un utilisateur</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                          user.name ||
                          user.email}{' '}
                        ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <select
                    id="role"
                    name="role"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="viewer">Client user (lecture)</option>
                    <option value="client_admin">Client admin</option>
                  </select>
                </div>

                <Button type="submit" className="w-full">
                  Ajouter le membre
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Membres actuels</CardTitle>
            <CardDescription>{tenant.memberships.length} membre(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenant.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun membre</p>
              ) : (
                tenant.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {[membership.user.firstName, membership.user.lastName]
                            .filter(Boolean)
                            .join(' ') ||
                            membership.user.name ||
                            membership.user.email}
                        </p>
                        <Badge variant="outline">{membership.user.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {membership.user.email}
                        {membership.user.phone ? ` · ${membership.user.phone}` : ''}
                      </p>
                      <div className="mt-2">
                        <Badge variant={membership.role === 'client_admin' ? 'accent' : 'default'}>
                          {membership.role === 'client_admin' ? 'Client admin' : 'Client user'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <form action={updateMemberRole}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={membership.role === 'viewer' ? 'client_admin' : 'viewer'}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          {membership.role === 'viewer' ? '→ Client admin' : '→ Client user'}
                        </Button>
                      </form>

                      <form action={removeMember}>
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <Button type="submit" variant="destructive" size="sm">
                          Retirer
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
