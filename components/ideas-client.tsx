'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Idea = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
};

async function fetchIdeas(tenantId: string): Promise<Idea[]> {
  const res = await fetch(`/api/ideas?tenantId=${tenantId}`);
  if (!res.ok) throw new Error('Failed to load ideas');
  return res.json();
}

export default function IdeasClient({ tenantId }: { tenantId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ideas', tenantId],
    queryFn: () => fetchIdeas(tenantId)
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Chargement...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Impossible de charger les idees.</div>;
  }

  return (
    <div className="grid gap-4">
      {data?.map((idea) => (
        <Card key={idea.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-base">{idea.title}</CardTitle>
            <Badge variant="outline">{idea.status}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{idea.description ?? 'Pas de description.'}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
