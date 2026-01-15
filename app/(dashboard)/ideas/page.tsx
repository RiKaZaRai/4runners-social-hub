import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import IdeasClient from '@/components/ideas-client';
import IdeaCreateClient from '@/components/idea-create-client';

export default async function IdeasPage({
  searchParams
}: {
  searchParams: { tenantId?: string };
}) {
  await requireSession();
  const tenantId = searchParams.tenantId;
  if (!tenantId) redirect('/spaces');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Backlog client</p>
        <h2 className="text-2xl font-semibold">Idees</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Proposez vos idees. L'agence les transforme ensuite en posts a valider.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle idee</CardTitle>
          </CardHeader>
          <CardContent>
            <IdeaCreateClient tenantId={tenantId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Idees en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <IdeasClient tenantId={tenantId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
