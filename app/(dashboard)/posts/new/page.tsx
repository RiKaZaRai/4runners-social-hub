import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default async function NewPostPage({
  searchParams
}: {
  searchParams: { tenantId?: string };
}) {
  await requireSession();
  const tenantId = searchParams.tenantId;
  if (!tenantId) redirect('/select-tenant');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau post</CardTitle>
      </CardHeader>
      <CardContent>
        <form action="/api/posts" method="post" className="space-y-4">
          <Input name="title" placeholder="Titre" required />
          <Textarea name="body" placeholder="Contenu" required />
          <input type="hidden" name="tenantId" value={tenantId} />
          <Button type="submit">Creer</Button>
        </form>
      </CardContent>
    </Card>
  );
}
