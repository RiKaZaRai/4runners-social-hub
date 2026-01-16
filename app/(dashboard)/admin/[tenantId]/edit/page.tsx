import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function EditTenantPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const session = await requireSession();

  // Verify user is agency_admin
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/spaces');
  }

  // Get tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    notFound();
  }

  async function updateTenant(formData: FormData) {
    'use server';

    const id = formData.get('tenantId') as string;
    const name = formData.get('name') as string;

    if (!name || name.trim() === '') {
      redirect(`/admin/${id}/edit?error=name_required`);
    }

    try {
      await prisma.tenant.update({
        where: { id },
        data: { name: name.trim() }
      });

      redirect(`/admin/${id}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      redirect(`/admin/${id}/edit?error=update_failed`);
    }
  }

  async function deleteTenant(formData: FormData) {
    'use server';

    const id = formData.get('tenantId') as string;

    try {
      await prisma.tenant.delete({
        where: { id }
      });

      redirect('/spaces');
    } catch (error) {
      console.error('Error deleting tenant:', error);
      redirect(`/admin/${id}/edit?error=delete_failed`);
    }
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href={`/admin/${tenantId}`}
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
              <input type="hidden" name="tenantId" value={tenantId} />
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
                  <Link href={`/admin/${tenantId}`}>Annuler</Link>
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
              <input type="hidden" name="tenantId" value={tenantId} />
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
