import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, name: true, email: true }
  });

  const isAgency = user?.role === 'agency_admin';

  if (!user) {
    redirect('/login');
  }

  const tenantIds = await prisma.tenantMembership.findMany({
    where: { userId: session.userId },
    select: { tenantId: true }
  });
  const tenantIdList = tenantIds.map((item) => item.tenantId);

  const [tenantCount, postCount, userCount] = await Promise.all([
    isAgency
      ? prisma.tenant.count()
      : prisma.tenant.count({ where: { id: { in: tenantIdList } } }),
    isAgency
      ? prisma.post.count()
      : prisma.post.count({ where: { tenantId: { in: tenantIdList } } }),
    isAgency
      ? prisma.user.count()
      : prisma.tenantMembership.count({ where: { tenantId: { in: tenantIdList } } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Accueil</p>
        <h1 className="text-2xl font-semibold">
          Bonjour {user.name ?? user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue d’ensemble de votre activité.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{tenantCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{postCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {isAgency ? 'Utilisateurs' : 'Membres'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{userCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Ajoutez vos widgets métiers ici : prochains posts, validations en attente,
        jobs récents, etc.
      </div>
    </div>
  );
}
