import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CsrfInput } from '@/components/csrf-input';
import { Toast } from '@/components/toast';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import type { InboxActorType, InboxItemType, InboxStatus } from '@prisma/client';

const STATUS_LABELS: Record<InboxStatus, string> = {
  unread: 'Non lu',
  open: 'Ouvert',
  done: 'Termine',
  blocked: 'Bloque'
};

const TYPE_LABELS: Record<InboxItemType, string> = {
  message: 'Message',
  validation: 'Validation',
  signal: 'Signal'
};

const ACTOR_LABELS: Record<InboxActorType, string> = {
  agency: 'Agence',
  client: 'Client',
  system: 'Systeme'
};

export default async function InboxPage({
  searchParams
}: {
  searchParams?: { hideDone?: string; error?: string };
}) {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  if (!currentUser) {
    redirect('/login');
  }

  const isAgency = isAgencyRole(currentUser.role);
  const isClient = isClientRole(currentUser.role);
  const hideDone = searchParams?.hideDone !== '0';

  let items: Array<{
    id: string;
    title: string;
    description: string | null;
    status: InboxStatus;
    type: InboxItemType;
    actorType: InboxActorType;
    actionUrl: string;
    updatedAt: Date;
    space: { id: string; name: string } | null;
  }> = [];

  if (isAgency) {
    items = await prisma.inboxItem.findMany({
      where: hideDone ? { status: { not: 'done' } } : {},
      include: {
        space: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  } else if (isClient) {
    const memberships = await prisma.tenantMembership.findMany({
      where: { userId: session.userId },
      select: { tenantId: true }
    });
    const spaceIds = memberships.map((m) => m.tenantId);

    items = await prisma.inboxItem.findMany({
      where: {
        spaceId: { in: spaceIds },
        ...(hideDone ? { status: { not: 'done' } } : {})
      },
      include: {
        space: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Messages</p>
        <h2 className="text-2xl font-semibold">Inbox</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Consultez vos notifications et messages.
        </p>
      </div>

      {searchParams?.error === 'forbidden' && (
        <Toast
          message="Seule l'agence peut marquer 'Bloqué'."
          storageKey="toast:inbox:blocked"
        />
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={hideDone ? '/inbox?hideDone=0' : '/inbox'}>
            {hideDone ? 'Afficher termines' : 'Masquer termines'}
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-muted-foreground">Aucun message pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const showSpace = Boolean(item.space?.name);
            const canBlock = isAgency;
            const canReopen = item.status !== 'open';
            const canDone = item.status !== 'done';
            const canBlocked = canBlock && item.status !== 'blocked';

            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <a className="hover:underline" href={item.actionUrl}>
                        {item.title}
                      </a>
                    </CardTitle>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{TYPE_LABELS[item.type]}</span>
                      <span>•</span>
                      <span>{ACTOR_LABELS[item.actorType]}</span>
                      {showSpace && (
                        <>
                          <span>•</span>
                          <span>{item.space?.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Maj {item.updatedAt.toDateString()}</span>
                    </div>
                  </div>
                  <Badge variant={item.status === 'done' ? 'accent' : 'outline'}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {canDone && (
                    <form action={`/api/inbox/${item.id}/status`} method="post">
                      <CsrfInput />
                      <input type="hidden" name="status" value="done" />
                      <Button type="submit" size="sm">
                        Marquer done
                      </Button>
                    </form>
                  )}
                  {canBlocked && (
                    <form action={`/api/inbox/${item.id}/status`} method="post">
                      <CsrfInput />
                      <input type="hidden" name="status" value="blocked" />
                      <Button type="submit" size="sm" variant="outline">
                        Marquer bloque
                      </Button>
                    </form>
                  )}
                  {canReopen && (
                    <form action={`/api/inbox/${item.id}/status`} method="post">
                      <CsrfInput />
                      <input type="hidden" name="status" value="open" />
                      <Button type="submit" size="sm" variant="outline">
                        Remettre open
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
