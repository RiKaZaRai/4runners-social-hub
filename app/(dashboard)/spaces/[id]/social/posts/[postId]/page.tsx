import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasModule } from '@/lib/modules';
import { isAgencyAdmin, isAgencyRole, isClientRole } from '@/lib/roles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SocialPostActions from '@/components/social-post-actions';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  pending_client: 'En validation',
  changes_requested: 'Modifications demandées',
  approved: 'Approuvé'
};

export default async function SocialPostPage({
  params
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id: spaceId, postId } = await params;
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user) {
    redirect('/login');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: spaceId },
    select: { name: true, active: true, modules: true }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  const role = user.role;
  const isAdmin = isAgencyAdmin(role);
  const isAgency = isAgencyRole(role);

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

  const post = await prisma.post.findFirst({
    where: { id: postId, tenantId: spaceId },
    include: {
      comments: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!post) {
    redirect(`/spaces/${spaceId}/social`);
  }

  const isClient = isClientRole(role);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Réseaux</p>
        <div className="flex items-center gap-3">
          <Link
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            href={`/spaces/${spaceId}/social`}
          >
            ← Retour à la liste
          </Link>
          <Badge>{STATUS_LABEL[post.status] ?? post.status}</Badge>
        </div>
        <h1 className="text-2xl font-semibold">{post.title}</h1>
      </header>

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-4">{post.body}</p>
        <SocialPostActions
          spaceId={spaceId}
          postId={post.id}
          status={post.status}
          isAgency={isAgency}
          isClient={isClient}
        />
      </section>

      <section className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle>Fil de discussion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {post.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</p>
            )}
            {post.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border px-4 py-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  <span>{comment.authorRole === 'client' ? 'Client' : 'Agence'}</span>
                  <span>{new Date(comment.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <p className="mt-2 text-sm">{comment.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
