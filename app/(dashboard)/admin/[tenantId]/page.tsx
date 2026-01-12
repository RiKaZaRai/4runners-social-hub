import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function AdminTenantPage({ params }: { params: { tenantId: string } }) {
  const session = await requireSession();

  // Verify user is agency_admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/select-tenant');
  }

  // Get tenant with detailed information
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    include: {
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      },
      posts: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { comments: true }
          }
        }
      },
      _count: {
        select: {
          posts: true,
          memberships: true
        }
      }
    }
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{tenant.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Créé le {new Date(tenant.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/posts?tenantId=${tenant.id}`}>Voir comme client</Link>
              </Button>
              <Button asChild>
                <Link href={`/admin/${tenant.id}/settings`}>Paramètres</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tenant._count.posts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Membres</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tenant._count.memberships}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Commentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {tenant.posts.reduce((sum, p) => sum + p._count.comments, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle>Membres</CardTitle>
              <CardDescription>Utilisateurs ayant accès à ce client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenant.memberships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun membre</p>
                ) : (
                  tenant.memberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{membership.user.name || membership.user.email}</p>
                        <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                      </div>
                      <Badge variant={membership.user.role === 'agency_admin' ? 'accent' : 'outline'}>
                        {membership.user.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <Button className="mt-4 w-full" variant="outline" asChild>
                <Link href={`/admin/${tenant.id}/members`}>Gérer les membres</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Posts récents</CardTitle>
              <CardDescription>Les 10 derniers posts créés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenant.posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun post</p>
                ) : (
                  tenant.posts.map((post) => (
                    <div key={post.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">{post.title || post.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString('fr-FR')} •{' '}
                            {post._count.comments} commentaire(s)
                          </p>
                        </div>
                        <Badge variant={post.status === 'published' ? 'accent' : 'outline'}>
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button className="mt-4 w-full" variant="outline" asChild>
                <Link href={`/posts?tenantId=${tenant.id}`}>Voir tous les posts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
