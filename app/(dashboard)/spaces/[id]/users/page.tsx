import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SpaceUsers } from '@/components/space-users';
import {
  isAgencyAdmin,
  isAgencyManager,
  isAgencyRole,
  isClientRole
} from '@/lib/roles';
import { Badge } from '@/components/ui/badge';

export default async function SpaceUsersPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const { id } = params;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const isAgency = isAgencyRole(currentUser.role);
  const isClient = isClientRole(currentUser.role);

  if (!isAgency && !isClient) {
    redirect('/spaces');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, active: true }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  if (isClient && !tenant.active) {
    redirect('/select-tenant');
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: id, userId: session.userId } }
  });

  if (isClient && !membership) {
    redirect('/spaces');
  }

  const canManage =
    isAgency &&
    (isAgencyAdmin(currentUser.role) ||
      (isAgencyManager(currentUser.role) && Boolean(membership)));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/spaces/${tenant.id}/overview`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour à l'espace
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold">Utilisateurs · {tenant.name}</h2>
          {!tenant.active && (
            <Badge variant="default">Inactif</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez les membres de l’espace et invitez de nouveaux profils.
        </p>
      </div>

      <SpaceUsers spaceId={id} canManage={canManage} />
    </div>
  );
}
