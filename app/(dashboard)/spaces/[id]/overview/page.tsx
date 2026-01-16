import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isAgencyAdmin, isAgencyManager, isClientRole } from '@/lib/roles';
import { hasModule } from '@/lib/modules.server';
import {
  MessageSquare,
  Users,
  Settings,
  FileText,
  Lightbulb,
  Share2,
  ArrowRight
} from 'lucide-react';

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
  const isManager = isAgencyManager(currentUser.role);
  const isClient = isClientRole(currentUser.role);
  const canManage = isAdmin || isManager;

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

  if (isClient && !tenant.active) {
    redirect('/spaces');
  }

  const hasSocialModule = await hasModule(id, 'social');
  const hasMessagesModule = await hasModule(id, 'messages');

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

  const pendingPosts = recentPosts.filter(
    (p) => p.status === 'pending_client' || p.status === 'changes_requested'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Client</p>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{tenant.name}</h2>
          {!tenant.active && <Badge variant="default">Inactif</Badge>}
        </div>
      </div>

      {/* Quick Actions - Dense horizontal bar */}
      <div className="flex flex-wrap gap-2">
        {hasMessagesModule && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/spaces/${id}/messages`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
            </Link>
          </Button>
        )}
        {hasSocialModule && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/spaces/${id}/social`}>
              <Share2 className="mr-2 h-4 w-4" />
              Demandes
              {pendingPosts.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingPosts.length}
                </Badge>
              )}
            </Link>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/spaces/${id}/users`}>
            <Users className="mr-2 h-4 w-4" />
            Utilisateurs
          </Link>
        </Button>
        {canManage && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/spaces/${id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Parametres
            </Link>
          </Button>
        )}
      </div>

      {/* Dashboard Zone - Placeholder for future KPIs */}
      <Card className="border-dashed">
        <CardContent className="flex min-h-[200px] items-center justify-center py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Zone dashboard - Indicateurs a venir
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Posts requiring attention */}
        {hasSocialModule && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Posts recents
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/spaces/${id}/social`}>
                    Voir tout
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentPosts.length > 0 ? (
                <div className="space-y-2">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/spaces/${id}/social/posts/${post.id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-muted"
                    >
                      <span className="truncate font-medium">{post.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase">
                          {post.network}
                        </span>
                        <Badge
                          variant={
                            post.status === 'pending_client' || post.status === 'changes_requested'
                              ? 'accent'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {post.status === 'pending_client'
                            ? 'En attente'
                            : post.status === 'changes_requested'
                              ? 'Modifs'
                              : post.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun post</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ideas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4" />
                Idees
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/ideas?tenantId=${id}`}>
                  Voir tout
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md border px-3 py-4">
              <span className="text-2xl font-semibold">{tenant._count.ideas}</span>
              <span className="text-sm text-muted-foreground">idees au total</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
