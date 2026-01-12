import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

type TeamsPageProps = {
  searchParams?: {
    message?: string;
    error?: string;
  };
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (user?.role !== 'agency_admin') {
    redirect('/home');
  }

  const [users, tenants] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  async function createUser(formData: FormData) {
    'use server';

    const firstName = (formData.get('firstName') as string | null)?.trim();
    const lastName = (formData.get('lastName') as string | null)?.trim();
    const phone = (formData.get('phone') as string | null)?.trim() || null;
    const email = (formData.get('email') as string | null)?.trim().toLowerCase();
    const password = formData.get('password') as string | null;
    const role = formData.get('role') as 'agency_admin' | 'agency_user' | null;
    const tenantIds = formData.getAll('tenantIds') as string[];

    if (!firstName || !lastName || !email || !password || !role) {
      redirect('/teams?error=missing_fields');
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;

      await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            firstName,
            lastName,
            phone,
            name,
            email,
            role,
            passwordHash
          }
        });

        if (tenantIds.length > 0) {
          await tx.tenantMembership.createMany({
            data: tenantIds.map((tenantId) => ({
              tenantId,
              userId: created.id,
              role: 'viewer'
            }))
          });
        }
      });

      redirect('/teams?message=user_created');
    } catch (error) {
      console.error('Error creating user:', error);
      redirect('/teams?error=create_failed');
    }
  }

  const showMessage = searchParams?.message;
  const showError = searchParams?.error;

  const usersByRole = users.reduce<Record<string, number>>((acc, member) => {
    acc[member.role] = (acc[member.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Equipes</p>
        <h1 className="text-2xl font-semibold">Utilisateurs 4runners</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les membres internes et leurs rôles.
        </p>
      </div>

      {showMessage && (
        <Card className="border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-100">
          <CardContent className="py-3">
            Utilisateur créé avec succès.
          </CardContent>
        </Card>
      )}

      {showError && (
        <Card className="border-rose-500/40 bg-rose-500/10 text-sm text-rose-100">
          <CardContent className="py-3">
            Impossible de créer l'utilisateur. Vérifiez les champs ou l'email.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Créer un utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" placeholder="Prénom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" placeholder="Nom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" placeholder="+33 6 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle global</Label>
              <select
                id="role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="agency_admin">Admin 4runners</option>
                <option value="agency_user">Gestionnaire 4runners</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Dossiers clients gérés</Label>
              {tenants.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun client pour le moment.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tenants.map((tenant) => (
                    <label
                      key={tenant.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input type="checkbox" name="tenantIds" value={tenant.id} />
                      <span>{tenant.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                Créer l'utilisateur
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Membres ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(usersByRole).length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {Object.entries(usersByRole).map(([roleName, count]) => (
                <span key={roleName} className="rounded-full border border-border px-3 py-1">
                  {roleName} · {count}
                </span>
              ))}
            </div>
          )}
          {users.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"
            >
              <div>
                <div className="font-medium">
                  {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.name || member.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.email}
                  {member.phone ? ` · ${member.phone}` : ''}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {member.role}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Aucun utilisateur pour le moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
