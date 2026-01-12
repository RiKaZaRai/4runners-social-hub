import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const session = await requireSession();

  // Verify user is agency_admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, name: true, firstName: true, lastName: true, email: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/select-tenant');
  }

  // Get all tenants with some stats
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          posts: true,
          memberships: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.name ||
    user?.email ||
    '';

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard Agence</p>
            <h1 className="text-3xl font-semibold">Tous les clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connecté en tant que {displayName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/new-tenant">Nouveau Client</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/settings">Paramètres</Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tenants.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {tenants.reduce((sum, t) => sum + t._count.posts, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {tenants.reduce((sum, t) => sum + t._count.memberships, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Grid */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Clients</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Link key={tenant.id} href={`/admin/${tenant.id}`}>
                <Card className="transition hover:border-primary">
                  <CardHeader>
                    <CardTitle>{tenant.name}</CardTitle>
                    <CardDescription>
                      Créé le {new Date(tenant.createdAt).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{tenant._count.posts}</span> posts
                      </div>
                      <div>
                        <span className="font-medium">{tenant._count.memberships}</span> membres
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {tenants.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun client pour le moment</p>
                <Button className="mt-4" asChild>
                  <Link href="/admin/new-tenant">Créer un client</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  );
}
