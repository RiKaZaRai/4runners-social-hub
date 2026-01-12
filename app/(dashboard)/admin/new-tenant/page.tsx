import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ERROR_MESSAGES: Record<string, string> = {
  name_required: 'Veuillez renseigner un nom de client.',
  unauthorized: 'Acces refuse.',
  duplicate: 'Un client avec ce nom existe deja.',
  creation_failed: 'Impossible de creer le client pour le moment.'
};

export default async function NewTenantPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
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

    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (user?.role !== 'agency_admin') {
      redirect('/select-tenant?error=unauthorized');
    }

    const name = formData.get('name') as string;

    if (!name || name.trim() === '') {
      redirect('/admin/new-tenant?error=name_required');
    }

    try {
      const tenant = await prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: { name: name.trim() }
        });

        await tx.tenantMembership.create({
          data: {
            tenantId: created.id,
            userId: session.userId,
            role: 'client_admin'
          }
        });

        return created;
      });

      redirect(`/admin/${tenant.id}`);
    } catch (error) {
      console.error('Error creating tenant:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        redirect('/admin/new-tenant?error=duplicate');
      }
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
            {searchParams?.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {ERROR_MESSAGES[searchParams.error] ?? ERROR_MESSAGES.creation_failed}
              </div>
            )}
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
