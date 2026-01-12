import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CsrfInput } from '@/components/csrf-input';

export default async function JobsPage() {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  if (!currentUser || currentUser.role === 'client') {
    redirect('/posts');
  }

  // Get user's tenant memberships for filtering
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.userId },
    select: { tenantId: true }
  });
  const tenantIds = memberships.map(m => m.tenantId);

  // Only fetch jobs for tenants the user has access to
  const jobs = await prisma.outboxJob.findMany({
    where: {
      tenantId: {
        in: tenantIds
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Observabilite</p>
        <h2 className="text-2xl font-semibold">Jobs / erreurs</h2>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{job.type}</CardTitle>
              <Badge variant={job.status === 'failed' ? 'accent' : 'outline'}>{job.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground">Tentatives: {job.attempts}</div>
              {job.lastError && <div className="text-red-600">{job.lastError}</div>}
              {job.status === 'failed' && (
                <form action="/api/jobs/retry" method="post">
                  <CsrfInput />
                  <input type="hidden" name="jobId" value={job.id} />
                  <Button type="submit" size="sm">Relancer</Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
