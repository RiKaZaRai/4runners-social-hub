import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCsrfToken } from '@/lib/csrf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CsrfInput } from '@/components/csrf-input';
import { canCreateClients, isClientRole } from '@/lib/roles';
import crypto from 'crypto';
import { ArrowLeft } from 'lucide-react';

export default async function NewSpacePage() {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser || isClientRole(currentUser.role) || !canCreateClients(currentUser.role)) {
    redirect('/spaces');
  }

  async function createSpace(formData: FormData) {
    'use server';

    const session = await requireSession();
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!currentUser || isClientRole(currentUser.role) || !canCreateClients(currentUser.role)) {
      redirect('/spaces');
    }

    const name = formData.get('name')?.toString();
    if (!name || name.trim().length < 2) {
      redirect('/spaces/new?error=name_required');
    }

    const formToken = formData.get('csrf_token')?.toString();
    const cookieToken = await getCsrfToken();
    if (!formToken || !cookieToken || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(formToken))) {
      redirect('/spaces/new?error=csrf');
    }

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: name.trim() }
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId,
          role: 'viewer'
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: 'tenant.create',
          entityType: 'tenant',
          entityId: tenant.id,
          payload: { name: tenant.name, userId: session.userId }
        }
      });

      return tenant;
    });

    revalidatePath('/spaces');
    revalidatePath('/spaces', 'layout');
    revalidatePath('/home');
    redirect(`/spaces/${created.id}/overview`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/spaces"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux espaces
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Creation</p>
        <h2 className="text-2xl font-semibold">Nouvel espace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Creez un nouvel espace pour gerer les contenus d'un client.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSpace} className="space-y-4">
            <CsrfInput />
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nom de l'espace
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Entreprise ABC"
                required
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Le nom doit contenir au moins 2 caracteres.
              </p>
            </div>
            <div className="flex gap-3">
              <Button type="submit">Creer l'espace</Button>
              <Button variant="outline" asChild>
                <Link href="/spaces">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
