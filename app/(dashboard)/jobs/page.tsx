import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function JobsPage() {
  await requireSession();
  const jobs = await prisma.outboxJob.findMany({
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
