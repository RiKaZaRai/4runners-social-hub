import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function EditTenantPage({ params }: { params: { tenantId: string } }) {
  const session = await requireSession();

  // Verify user is agency_admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/select-tenant');
  }

  // Get tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId }
  });

  if (!tenant) {
    notFound();
  }

  async function updateTenant(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;

    if (!name || name.trim() === '') {
      redirect(`/admin/${params.tenantId}/edit?error=name_required`);
    }

    try {
      await prisma.tenant.update({
        where: { id: params.tenantId },
        data: { name: name.trim() }
      });

      redirect(`/admin/${params.tenantId}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      redirect(`/admin/${params.tenantId}/edit?error=update_failed`);
    }
  }

  async function deleteTenant() {
    'use server';

    try {
      await prisma.tenant.delete({
        where: { id: params.tenantId }
      });

      redirect('/spaces');
    } catch (error) {
      console.error('Error deleting tenant:', error);
      redirect(`/admin/${params.tenantId}/edit?error=delete_failed`);
    }
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href={`/admin/${params.tenantId}`}
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au client
          </Link>
          <h1 className="text-3xl font-semibold">Modifier le client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modifier les informations de {tenant.name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations du client</CardTitle>
            <CardDescription>
              Modifier les informations du client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateTenant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du client</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={tenant.name}
                  placeholder="Ex: Entreprise ABC"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Enregistrer
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/admin/${params.tenantId}`}>Annuler</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
            <CardDescription>
              Actions irréversibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteTenant}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Supprimer ce client</p>
                  <p className="text-sm text-muted-foreground">
                    Cette action supprimera définitivement le client et toutes ses données
                  </p>
                </div>
                <Button type="submit" variant="destructive">
                  Supprimer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
