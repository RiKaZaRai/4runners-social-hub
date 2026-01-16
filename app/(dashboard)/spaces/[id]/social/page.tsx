import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasModule } from '@/lib/modules';
import { isAgencyAdmin, isAgencyRole, isClientRole } from '@/lib/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StatusLabel = {
  label: string;
  variant: 'default' | 'accent' | 'outline';
};

const STATUS_BADGE: Record<string, StatusLabel> = {
  pending_client: { label: 'En validation', variant: 'accent' },
  changes_requested: { label: 'Modifications demandées', variant: 'outline' },
  approved: { label: 'Approuvé', variant: 'default' }
};

export default async function SocialSpacePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: spaceId } = await params;
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: spaceId },
    select: { name: true, active: true, modules: true }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  const role = currentUser.role;
  const isAgency = isAgencyRole(role);
  const isAdmin = isAgencyAdmin(role);

  if (!isAdmin && !tenant.active) {
    redirect('/spaces');
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: spaceId, userId: session.userId } }
  });

  if (!isAgency && !membership) {
    redirect('/spaces');
  }

  const moduleEnabled = await hasModule(spaceId, 'social');
  if (!moduleEnabled) {
    redirect(`/spaces/${spaceId}/overview`);
  }

  const [pendingPosts, approvedPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        tenantId: spaceId,
        status: { in: ['pending_client', 'changes_requested'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    }),
    prisma.post.findMany({
      where: {
        tenantId: spaceId,
        status: 'approved'
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Réseaux</p>
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <p className="text-sm text-muted-foreground">
          Suivez le flux de validation des posts sociaux et gardez vos clients dans la boucle.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>En validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPosts.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun post en validation.</p>
            )}
            {pendingPosts.map((post) => {
              const badge = STATUS_BADGE[post.status] ?? {
                label: post.status,
                variant: 'default' as const
              };
              return (
                <Link
                  key={post.id}
                  href={`/spaces/${spaceId}/social/posts/${post.id}`}
                  className="flex flex-col gap-1 rounded-md border border-border px-4 py-3 hover:border-primary hover:bg-muted"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">{post.title}</p>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.body}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approuvés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvedPosts.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun post approuvé.</p>
            )}
            {approvedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/spaces/${spaceId}/social/posts/${post.id}`}
                className="flex flex-col gap-1 rounded-md border border-border px-4 py-3 hover:border-primary hover:bg-muted"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">{post.title}</p>
                  <Badge variant="default">Approuvé</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.body}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
