import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAgencyAdmin, isAgencyRole } from '@/lib/roles';

export default async function SelectTenantPage() {
  const session = await requireSession();

  // Get user to check role
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (isAgencyAdmin(user?.role)) {
    redirect('/admin');
  }
  if (isAgencyRole(user?.role)) {
    redirect('/spaces');
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      userId: session.userId,
      tenant: { active: true } // Only show active tenants
    },
    include: { tenant: true }
  });

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Choisir un compte</p>
          <h1 className="text-2xl font-semibold">Acces client</h1>
        </div>
        <div className="grid gap-4">
          {memberships.map((membership) => (
            <Link key={membership.id} href={`/posts?tenantId=${membership.tenantId}`}>
              <Card className="transition hover:border-primary">
                <CardHeader>
                  <CardTitle>{membership.tenant.name}</CardTitle>
                  <CardDescription>Ouvrir le workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Acces agence/client</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
