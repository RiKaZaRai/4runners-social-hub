import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function NewTenantPage() {
  const session = await requireSession();

  // Verify user is agency_admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/select-tenant');
  }

  async function createTenant(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;

    if (!name || name.trim() === '') {
      redirect('/admin/new-tenant?error=name_required');
    }

    try {
      const tenant = await prisma.tenant.create({
        data: { name: name.trim() }
      });

      redirect(`/admin/${tenant.id}`);
    } catch (error) {
      console.error('Error creating tenant:', error);
      redirect('/admin/new-tenant?error=creation_failed');
    }
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au dashboard
          </Link>
          <h1 className="text-3xl font-semibold">Nouveau Client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créer un nouveau compte client
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations du client</CardTitle>
            <CardDescription>
              Entrez les informations pour créer un nouveau client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTenant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du client</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ex: Entreprise ABC"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Créer le client
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin">Annuler</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
