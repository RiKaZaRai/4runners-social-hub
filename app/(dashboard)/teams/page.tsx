import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/home');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Equipes</p>
        <h1 className="text-2xl font-semibold">Utilisateurs 4runners</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les membres internes et leurs rôles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Membres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{member.name ?? member.email}</div>
                <div className="text-xs text-muted-foreground">{member.email}</div>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {member.role}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Aucun utilisateur pour le moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
