import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, MessageCircle, LayoutList, Columns, Diff, Link2 } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canTransition } from '@/lib/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CsrfInput } from '@/components/csrf-input';
import {
  isAgencyAdmin,
  isAgencyManager,
  isAgencyProduction,
  isAgencyRole,
  isClientRole
} from '@/lib/roles';

function lineDiff(before: string, after: string) {
  const a = (before ?? '').split('\n');
  const b = (after ?? '').split('\n');
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const out: { type: 'same' | 'add' | 'del'; text: string }[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.push({ type: 'same', text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      out.push({ type: 'add', text: b[j - 1] });
      j--;
    } else if (i > 0) {
      out.push({ type: 'del', text: a[i - 1] });
      i--;
    }
  }

  return out.reverse();
}

function safeNetworkLabel(network: string) {
  return network.charAt(0).toUpperCase() + network.slice(1);
}

export default async function PostsPage({
  searchParams
}: {
  searchParams: { tenantId?: string; postId?: string; view?: string };
}) {
  const session = await requireSession();
  const tenantId = searchParams.tenantId;
  if (!tenantId) redirect('/spaces');

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  if (!currentUser) redirect('/login');
  const role = currentUser.role;
  const isClient = isClientRole(role);
  const isAgency = isAgencyRole(role);
  const isAdmin = isAgencyAdmin(role);
  const isManager = isAgencyManager(role);

  // Verify tenant exists and is active
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { active: true }
  });

  // If tenant doesn't exist or is inactive, redirect (unless admin)
  if (!tenant || (!isAdmin && !tenant.active)) {
    redirect('/spaces');
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.userId } }
  });

  if (!isAdmin && !membership) {
    redirect('/spaces');
  }

  const posts = await prisma.post.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });

  const selectedId = searchParams.postId ?? posts[0]?.id;
  const selectedPost = selectedId
    ? await prisma.post.findFirst({
        where: { id: selectedId, tenantId },
        include: { checklist: true, comments: true, assets: true }
      })
    : null;

  const versions = selectedPost
    ? await prisma.postVersion.findMany({
        where: { postId: selectedPost.id },
        orderBy: { createdAt: 'desc' },
        take: 2
      })
    : [];

  const latestBody = versions[0]?.body ?? selectedPost?.body ?? '';
  const previousBody = versions[1]?.body ?? '';
  const diffRows = lineDiff(previousBody, latestBody);

  const byStatus = posts.reduce<Record<string, typeof posts>>((acc, post) => {
    acc[post.status] = acc[post.status] ?? [];
    acc[post.status].push(post);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Editorial</p>
          <h2 className="text-2xl font-semibold">Posts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Validez rapidement, commentez au bon endroit, et gardez une trace claire des versions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAgency && (
            <>
              <Link
                className="text-sm text-primary hover:underline"
                href={`/posts/new?tenantId=${tenantId}`}
              >
                + Nouveau post
              </Link>
              {(isAdmin || isManager) && (
                <Link
                  className="text-sm text-muted-foreground hover:text-primary"
                  href={`/spaces?tenantId=${tenantId}`}
                >
                  Gerer client
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue={searchParams.view ?? 'list'}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <LayoutList className="h-4 w-4" /> Liste
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" /> Calendrier
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <Columns className="h-4 w-4" /> Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[70vh] divide-y overflow-auto">
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts?tenantId=${tenantId}&postId=${post.id}`}
                      className={`block px-4 py-3 transition hover:bg-muted ${
                        post.id === selectedId ? 'bg-muted/70' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{post.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{post.body}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {post.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {post.network}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {post.scheduledAt ? post.scheduledAt.toDateString() : 'Non planifie'}
                      </div>
                    </Link>
                  ))}
                  {posts.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground">Aucun post pour le moment.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedPost ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{selectedPost.title}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cree le {selectedPost.createdAt.toDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selectedPost.status}</Badge>
                        <Badge variant="outline" className="uppercase">
                          {selectedPost.network}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {selectedPost.scheduledAt
                          ? selectedPost.scheduledAt.toDateString()
                          : 'Non planifie'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {selectedPost.comments.length} commentaires
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-medium">Actions</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {isClient ? (
                          <>
                            {canTransition(selectedPost.status, 'approved') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="approved" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm">
                                  Valider
                                </Button>
                              </form>
                            )}
                            {canTransition(selectedPost.status, 'changes_requested') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="changes_requested" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm" variant="outline">
                                  Demander des modifs
                                </Button>
                              </form>
                            )}
                          </>
                        ) : (
                          <>
                            {canTransition(selectedPost.status, 'pending_client') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="pending_client" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm" variant="outline">
                                  {selectedPost.status === 'draft'
                                    ? 'Envoyer au client'
                                    : 'Repasser a valider'}
                                </Button>
                              </form>
                            )}
                            {canTransition(selectedPost.status, 'approved') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="approved" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm">
                                  Marquer valide
                                </Button>
                              </form>
                            )}
                            {canTransition(selectedPost.status, 'scheduled') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="scheduled" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm" variant="outline">
                                  Marquer programme
                                </Button>
                              </form>
                            )}
                            {canTransition(selectedPost.status, 'published') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="published" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm" variant="outline">
                                  Marquer publie
                                </Button>
                              </form>
                            )}
                            {canTransition(selectedPost.status, 'archived') && (
                              <form action={`/api/posts/${selectedPost.id}/status`} method="post">
                                <CsrfInput />
                                <input type="hidden" name="status" value="archived" />
                                <input type="hidden" name="tenantId" value={tenantId} />
                                <Button type="submit" size="sm" variant="outline">
                                  Archiver
                                </Button>
                              </form>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-medium">Apercu {safeNetworkLabel(selectedPost.network)}</div>
                      <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm">
                        <p className="whitespace-pre-wrap">{selectedPost.body}</p>
                        {selectedPost.assets[0] && (
                          <div className="mt-3 rounded-lg border bg-background p-2 text-xs text-muted-foreground">
                            Media: {selectedPost.assets[0].key}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border">
                      <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Diff className="h-4 w-4" /> Diff (avant / apres)
                        </div>
                        <Badge variant="outline">{versions.length} version(s)</Badge>
                      </div>
                      <div className="p-4 text-sm font-mono whitespace-pre-wrap">
                        {diffRows.map((row, idx) => (
                          <div
                            key={idx}
                            className={
                              row.type === 'add'
                                ? 'bg-emerald-50/60'
                                : row.type === 'del'
                                ? 'bg-rose-50/60'
                                : ''
                            }
                          >
                            <span className="inline-block w-5 text-muted-foreground">
                              {row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '}
                            </span>
                            {row.text || ' '}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      Partage interne: lien rapide vers ce post.
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Checklist de validation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedPost.checklist.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span>{item.label}</span>
                          <Badge variant={item.checked ? 'accent' : 'outline'}>
                            {item.checked ? 'OK' : 'TODO'}
                          </Badge>
                        </div>
                      ))}
                      {!isClient && (
                        <form action="/api/checklists" method="post" className="mt-3 flex gap-2">
                          <CsrfInput />
                          <Input type="text" name="label" placeholder="Nouvel item" required />
                          <input type="hidden" name="postId" value={selectedPost.id} />
                          <input type="hidden" name="tenantId" value={tenantId} />
                          <Button type="submit" size="sm">Ajouter</Button>
                        </form>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Commentaires</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedPost.comments.map((comment) => (
                        <div key={comment.id} className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{comment.authorRole}</p>
                          <p>{comment.body}</p>
                        </div>
                      ))}
                      <form action="/api/comments" method="post" className="space-y-2">
                        <CsrfInput />
                        <Textarea name="body" placeholder="Ajouter un commentaire" required />
                        <input type="hidden" name="postId" value={selectedPost.id} />
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="authorRole" value={isClient ? 'client' : 'agency'} />
                        <Button type="submit" size="sm">Commenter</Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {!isClient && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Medias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedPost.assets.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between text-sm">
                          <span>{asset.key}</span>
                          <a className="text-primary hover:underline" href={asset.url}>
                            Ouvrir
                          </a>
                        </div>
                      ))}
                      <form
                        action="/api/assets/upload"
                        method="post"
                        encType="multipart/form-data"
                        className="mt-3 flex gap-2"
                      >
                        <CsrfInput />
                        <Input type="file" name="file" required />
                        <input type="hidden" name="tenantId" value={tenantId} />
                        <input type="hidden" name="postId" value={selectedPost.id} />
                        <Button type="submit" size="sm">Uploader</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Aucun post selectionne.</CardContent>
              </Card>
            )}
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
          <div className="flex gap-4 overflow-auto pb-2">
            {[
              { key: 'draft', label: 'Brouillon' },
              { key: 'pending_client', label: 'A valider' },
              { key: 'changes_requested', label: 'Modifs' },
              { key: 'approved', label: 'Valide' },
              { key: 'scheduled', label: 'Programme' },
              { key: 'published', label: 'Publie' },
              { key: 'archived', label: 'Archive' }
            ].map((column) => (
              <div key={column.key} className="min-w-[260px] max-w-[320px] flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">{column.label}</div>
                  <Badge variant="outline">{(byStatus[column.key] ?? []).length}</Badge>
                </div>
                <div className="space-y-2 rounded-xl border bg-muted/30 p-2">
                  {(byStatus[column.key] ?? []).map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts?tenantId=${tenantId}&postId=${post.id}`}
                      className="block rounded-lg border bg-background p-3 transition hover:-translate-y-0.5 hover:shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{post.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {post.scheduledAt ? post.scheduledAt.toDateString() : 'Non planifie'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {post.network}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{post.body}</div>
                    </Link>
                  ))}
                  {(byStatus[column.key] ?? []).length === 0 && (
                    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Rien ici.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
