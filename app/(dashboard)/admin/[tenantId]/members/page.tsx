import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function TenantMembersPage({ params }: { params: { tenantId: string } }) {
  const session = await requireSession();

  // Verify user is agency_admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/select-tenant');
  }

  // Get tenant with members
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    include: {
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) {
    notFound();
  }

  // Get all users to add them as members
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, firstName: true, lastName: true },
    orderBy: { email: 'asc' }
  });

  // Filter out users who are already members
  const availableUsers = allUsers.filter(
    (u) => !tenant.memberships.some((m) => m.userId === u.id)
  );

  async function addMember(formData: FormData) {
    'use server';

    const userId = formData.get('userId') as string;
    const role = formData.get('role') as 'viewer' | 'client_admin';

    if (!userId || !role) {
      redirect(`/admin/${params.tenantId}/members?error=missing_fields`);
    }

    try {
      await prisma.tenantMembership.create({
        data: {
          tenantId: params.tenantId,
          userId,
          role
        }
      });

      redirect(`/admin/${params.tenantId}/members`);
    } catch (error) {
      console.error('Error adding member:', error);
      redirect(`/admin/${params.tenantId}/members?error=add_failed`);
    }
  }

  async function removeMember(formData: FormData) {
    'use server';

    const membershipId = formData.get('membershipId') as string;

    if (!membershipId) {
      redirect(`/admin/${params.tenantId}/members?error=missing_id`);
    }

    try {
      await prisma.tenantMembership.delete({
        where: { id: membershipId }
      });

      redirect(`/admin/${params.tenantId}/members`);
    } catch (error) {
      console.error('Error removing member:', error);
      redirect(`/admin/${params.tenantId}/members?error=remove_failed`);
    }
  }

  async function updateMemberRole(formData: FormData) {
    'use server';

    const membershipId = formData.get('membershipId') as string;
    const role = formData.get('role') as 'viewer' | 'client_admin';

    if (!membershipId || !role) {
      redirect(`/admin/${params.tenantId}/members?error=missing_fields`);
    }

    try {
      await prisma.tenantMembership.update({
        where: { id: membershipId },
        data: { role }
      });

      redirect(`/admin/${params.tenantId}/members`);
    } catch (error) {
      console.error('Error updating member role:', error);
      redirect(`/admin/${params.tenantId}/members?error=update_failed`);
    }
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            href={`/admin/${params.tenantId}`}
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au client
          </Link>
          <h1 className="text-3xl font-semibold">Gérer les membres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Membres de {tenant.name}
          </p>
        </div>

        {/* Add Member */}
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
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.email} ({user.email})
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
                    <option value="viewer">Viewer (lecture seule)</option>
                    <option value="client_admin">Client Admin (peut valider les posts)</option>
                  </select>
                </div>

                <Button type="submit" className="w-full">
                  Ajouter le membre
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Membres actuels</CardTitle>
            <CardDescription>
              {tenant.memberships.length} membre(s)
            </CardDescription>
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
                          {[membership.user.firstName, membership.user.lastName].filter(Boolean).join(' ') ||
                            membership.user.name ||
                            membership.user.email}
                        </p>
                        <Badge variant="outline">{membership.user.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                      <div className="mt-2">
                        <Badge variant={membership.role === 'client_admin' ? 'accent' : 'default'}>
                          {membership.role === 'viewer' ? 'Viewer' : 'Client Admin'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <form action={updateMemberRole}>
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={membership.role === 'viewer' ? 'client_admin' : 'viewer'}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          {membership.role === 'viewer' ? '→ Admin' : '→ Viewer'}
                        </Button>
                      </form>

                      <form action={removeMember}>
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
