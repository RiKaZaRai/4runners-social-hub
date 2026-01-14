import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CsrfInput } from '@/components/csrf-input';
import { isAgencyAdmin, isClientRole } from '@/lib/roles';

export default async function PostDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { tenantId?: string };
}) {
  const session = await requireSession();
  const tenantId = searchParams.tenantId;
  if (!tenantId) redirect('/select-tenant');

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  if (!currentUser) redirect('/login');
  const isClient = isClientRole(currentUser.role);

  if (!isAgencyAdmin(currentUser.role)) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: session.userId } }
    });
    if (!membership && !isClientRole(currentUser.role)) {
      redirect('/select-tenant');
    }
    if (isClientRole(currentUser.role) && !membership) {
      redirect('/select-tenant');
    }
  }

  const post = await prisma.post.findFirst({
    where: { id: params.id, tenantId },
    include: { checklist: true, comments: true, assets: true }
  });

  if (!post) {
    redirect('/posts');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Post</p>
          <h2 className="text-2xl font-semibold">{post.title}</h2>
        </div>
        <Badge variant="outline">{post.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contenu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.body}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {post.checklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{item.checked ? 'OK' : 'TODO'}</span>
              </div>
            ))}
            {!isClient && (
              <form action="/api/checklists" method="post" className="mt-3 flex gap-2">
                <CsrfInput />
                <Input type="text" name="label" placeholder="Nouvel item" required />
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="tenantId" value={tenantId} />
                <Button type="submit" size="sm">Ajouter</Button>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{comment.authorRole}</p>
                <p>{comment.body}</p>
              </div>
            ))}
            <form action="/api/comments" method="post" className="space-y-2">
              <CsrfInput />
              <Textarea name="body" placeholder="Ajouter un commentaire" required />
              <input type="hidden" name="postId" value={post.id} />
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
            <CardTitle>Medias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {post.assets.map((asset) => (
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
              <input type="hidden" name="postId" value={post.id} />
              <Button type="submit" size="sm">Uploader</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
