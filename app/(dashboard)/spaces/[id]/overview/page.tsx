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
  Share2,
  AlertCircle,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

// Helper: map post status to FR label + badge variant
type PostStatusKey = 'draft' | 'pending_client' | 'changes_requested' | 'approved' | 'scheduled' | 'published' | 'archived';

function getStatusDisplay(status: PostStatusKey): { label: string; variant: 'default' | 'accent' | 'outline' } {
  const map: Record<PostStatusKey, { label: string; variant: 'default' | 'accent' | 'outline' }> = {
    draft: { label: 'Brouillon', variant: 'outline' },
    pending_client: { label: 'En attente client', variant: 'accent' },
    changes_requested: { label: 'Modifs demandees', variant: 'accent' },
    approved: { label: 'Approuve', variant: 'default' },
    scheduled: { label: 'Programme', variant: 'outline' },
    published: { label: 'Publie', variant: 'default' },
    archived: { label: 'Archive', variant: 'outline' }
  };
  return map[status] || { label: status, variant: 'outline' };
}

// Helper: action label for pending posts
function getActionLabel(status: PostStatusKey): string {
  if (status === 'pending_client') return 'Relancer / valider';
  if (status === 'changes_requested') return 'Appliquer modifs';
  return '';
}

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
      _count: {
        select: {
          ideas: true
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

  // Fetch pending posts (social module)
  let pendingPosts: { id: string; title: string; status: PostStatusKey; network: string }[] = [];
  let pendingCount = 0;

  if (hasSocialModule) {
    const posts = await prisma.post.findMany({
      where: {
        tenantId: id,
        status: { in: ['pending_client', 'changes_requested'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        network: true
      }
    });
    pendingPosts = posts.map((p) => ({ ...p, status: p.status as PostStatusKey }));

    // Count all pending (not just first 5)
    pendingCount = await prisma.post.count({
      where: {
        tenantId: id,
        status: { in: ['pending_client', 'changes_requested'] }
      }
    });
  }

  // Fetch unread messages count (using InboxItem with status=unread and type=message)
  let unreadMessagesCount = 0;
  if (hasMessagesModule) {
    unreadMessagesCount = await prisma.inboxItem.count({
      where: {
        spaceId: id,
        status: 'unread',
        type: 'message'
      }
    });
  }

  // Build "A traiter" items
  type ActionItem = {
    id: string;
    label: string;
    action: string;
    href: string;
    variant: 'default' | 'accent' | 'outline';
  };

  const actionItems: ActionItem[] = [];

  // Add pending posts
  if (hasSocialModule) {
    for (const post of pendingPosts) {
      actionItems.push({
        id: `post-${post.id}`,
        label: post.title,
        action: getActionLabel(post.status),
        href: `/spaces/${id}/social/posts/${post.id}`,
        variant: 'accent'
      });
    }
  }

  // Add unread messages
  if (hasMessagesModule && unreadMessagesCount > 0) {
    actionItems.push({
      id: 'messages-unread',
      label: `${unreadMessagesCount} message${unreadMessagesCount > 1 ? 's' : ''} non lu${unreadMessagesCount > 1 ? 's' : ''}`,
      action: 'Repondre',
      href: `/spaces/${id}/messages`,
      variant: 'accent'
    });
  }

  // KPIs to display (only for active modules)
  const kpis: { label: string; value: number | string; icon: typeof AlertCircle }[] = [];

  if (hasSocialModule) {
    kpis.push({ label: 'Validations', value: pendingCount, icon: AlertCircle });
  }
  if (hasMessagesModule) {
    kpis.push({ label: 'Non lus', value: unreadMessagesCount, icon: MessageSquare });
  }
  kpis.push({ label: 'Idees', value: tenant._count.ideas, icon: Lightbulb });

  // Primary CTA
  const primaryCta = hasSocialModule
    ? { label: 'Nouvelle demande', href: `/spaces/${id}/social` }
    : { label: 'Inviter un utilisateur', href: `/spaces/${id}/users` };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Client</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{tenant.name}</h2>
            {!tenant.active && <Badge variant="default">Inactif</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Priorite : traiter ce qui bloque (validations, reponses, relances).
          </p>
        </div>
        <Button asChild>
          <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
      </div>

      {/* Mini KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="py-3">
              <CardContent className="flex items-center gap-3 p-0 px-4">
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-semibold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* A traiter maintenant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4" />
            A traiter maintenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionItems.length > 0 ? (
            <div className="space-y-2">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-muted"
                >
                  <span className="truncate font-medium">{item.label}</span>
                  <Badge variant={item.variant} className="ml-2 shrink-0">
                    {item.action}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Rien a traiter pour le moment</p>
              <Button variant="outline" size="sm" asChild>
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shortcuts */}
      <div className="flex flex-wrap gap-2">
        {hasMessagesModule && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/spaces/${id}/messages`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
              {unreadMessagesCount > 0 && (
                <Badge variant="accent" className="ml-2">
                  {unreadMessagesCount}
                </Badge>
              )}
            </Link>
          </Button>
        )}
        {hasSocialModule && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/spaces/${id}/social`}>
              <Share2 className="mr-2 h-4 w-4" />
              Demandes
              {pendingCount > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingCount}
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
    </div>
  );
}
