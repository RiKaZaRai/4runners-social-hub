import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';

export default async function PostsPage({
  searchParams
}: {
  searchParams: { tenantId?: string };
}) {
  await requireSession();
  const tenantId = searchParams.tenantId;
  if (!tenantId) redirect('/select-tenant');

  const posts = await prisma.post.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });

  const byStatus = posts.reduce<Record<string, typeof posts>>((acc, post) => {
    acc[post.status] = acc[post.status] ?? [];
    acc[post.status].push(post);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Editorial</p>
          <h2 className="text-2xl font-semibold">Posts</h2>
        </div>
        <Link className="text-sm text-primary hover:underline" href={`/posts/new?tenantId=${tenantId}`}>
          + Nouveau post
        </Link>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}?tenantId=${tenantId}`}>
                <Card className="transition hover:border-primary">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <CardTitle className="text-base">{post.title}</CardTitle>
                    <Badge variant="outline">{post.status}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{post.body}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={16} /> Vue mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between text-sm">
                    <span>{post.title}</span>
                    <span className="text-muted-foreground">
                      {post.scheduledAt ? post.scheduledAt.toDateString() : 'Non planifie'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kanban">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              'draft',
              'pending_client',
              'changes_requested',
              'approved',
              'scheduled',
              'published',
              'archived'
            ].map((status) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{status}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(byStatus[status] ?? []).map((post) => (
                    <Link key={post.id} href={`/posts/${post.id}?tenantId=${tenantId}`}>
                      <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                        {post.title}
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
