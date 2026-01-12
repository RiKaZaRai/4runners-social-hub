import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CsrfInput } from '@/components/csrf-input';

export default async function NewPostPage({
  searchParams
}: {
  searchParams: { tenantId?: string };
}) {
  const session = await requireSession();
  const tenantId = searchParams.tenantId;
  if (!tenantId) redirect('/select-tenant');

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  if (!currentUser || currentUser.role === 'client') {
    redirect(`/posts?tenantId=${tenantId}`);
  }

  const channels = await prisma.tenantChannel.findMany({
    where: { tenantId },
    orderBy: { network: 'asc' }
  });
  const networks = channels.length
    ? channels.map((channel) => channel.network)
    : ['linkedin', 'instagram', 'facebook', 'x', 'tiktok'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau post</CardTitle>
      </CardHeader>
      <CardContent>
        <form action="/api/posts" method="post" className="space-y-4">
          <CsrfInput />
          <Input name="title" placeholder="Titre" required />
          <label className="block text-sm text-muted-foreground">Reseau</label>
          <select
            name="network"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            defaultValue="linkedin"
          >
            {networks.map((network) => (
              <option key={network} value={network}>
                {network === 'linkedin'
                  ? 'LinkedIn'
                  : network === 'instagram'
                  ? 'Instagram'
                  : network === 'facebook'
                  ? 'Facebook'
                  : network === 'tiktok'
                  ? 'TikTok'
                  : 'X'}
              </option>
            ))}
          </select>
          <Textarea name="body" placeholder="Contenu" required />
          <input type="hidden" name="tenantId" value={tenantId} />
          <Button type="submit">Creer</Button>
        </form>
      </CardContent>
    </Card>
  );
}
