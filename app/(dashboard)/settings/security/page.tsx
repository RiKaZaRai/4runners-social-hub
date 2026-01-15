import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyAdmin } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default async function SecuritySettingsPage() {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser || !isAgencyAdmin(currentUser.role)) {
    redirect('/home');
  }

  const recentAuditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      actor: {
        select: { email: true, firstName: true, lastName: true }
      },
      tenant: {
        select: { name: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Parametres
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
        <h2 className="text-2xl font-semibold">Securite</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Consultez les logs d'audit et les parametres de securite.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs d'audit recents</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAuditLogs.length > 0 ? (
            <div className="space-y-3">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.actor
                        ? [log.actor.firstName, log.actor.lastName].filter(Boolean).join(' ') || log.actor.email
                        : 'Systeme'}
                      {log.tenant && ` - ${log.tenant.name}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun log d'audit.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
