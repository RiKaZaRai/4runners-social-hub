import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isAgencyAdmin, isClientRole } from '@/lib/roles';
import { ArrowLeft, FileText, Lightbulb, Settings } from 'lucide-react';

export default async function SpaceOverviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = isAgencyAdmin(currentUser.role);
  const isClient = isClientRole(currentUser.role);

  // Check access
  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: id,
        userId: session.userId
      }
    }
  });

  if (!isAdmin && !membership) {
    redirect('/spaces');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      channels: true,
      _count: {
        select: {
          posts: true,
          ideas: true,
          memberships: true
        }
      }
    }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  // Block inactive tenants for clients
  if (isClient && !tenant.active) {
    redirect('/select-tenant');
  }

  const recentPosts = await prisma.post.findMany({
    where: { tenantId: id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      network: true,
      createdAt: true
    }
  });

  const recentIdeas = await prisma.idea.findMany({
    where: { tenantId: id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/spaces"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tous les espaces
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{tenant.name}</h2>
          {!tenant.active && (
            <Badge variant="default">Inactif</Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Vue d'ensemble de l'espace et acces rapide aux contenus.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{tenant._count.posts}</p>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{tenant._count.ideas}</p>
                <p className="text-sm text-muted-foreground">Idees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{tenant.channels.length}</p>
                <p className="text-sm text-muted-foreground">Reseaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/posts?tenantId=${tenant.id}`}>Voir les posts</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/ideas?tenantId=${tenant.id}`}>Voir les idees</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/spaces/${tenant.id}/messages`}>Messages</Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href={`/admin/${tenant.id}`}>Parametres</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Posts recents</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/posts?tenantId=${tenant.id}`}>Voir tout</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPosts.length > 0 ? (
              <ul className="space-y-3">
                {recentPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/posts/${post.id}`}
                      className="block rounded-md border px-3 py-2 transition hover:bg-muted"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{post.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {post.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {post.network} - {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun post pour le moment.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent ideas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Idees recentes</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/ideas?tenantId=${tenant.id}`}>Voir tout</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIdeas.length > 0 ? (
              <ul className="space-y-3">
                {recentIdeas.map((idea) => (
                  <li key={idea.id}>
                    <div className="rounded-md border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{idea.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {idea.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(idea.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune idee pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Reseaux sociaux</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.channels.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.channels.map((channel) => (
                <div key={channel.id} className="rounded-md border px-3 py-2">
                  <div className="font-medium uppercase">{channel.network}</div>
                  <div className="text-sm text-muted-foreground">
                    {channel.handle || 'Sans handle'}
                  </div>
                  {channel.url && (
                    <a
                      className="text-sm text-primary hover:underline"
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir le profil
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun reseau configure.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
