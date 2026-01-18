import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canCreateClients, isAgencyAdmin, isClientRole } from '@/lib/roles';
import { normalizeModules } from '@/lib/modules';
import { DashboardShell } from '@/components/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, name: true, email: true, firstName: true, lastName: true }
  });
  const isClient = isClientRole(currentUser?.role);
  const isAdmin = isAgencyAdmin(currentUser?.role);
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.userId },
    include: { tenant: true }
  });
  const tenants = isAdmin
    ? await prisma.tenant.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, modules: true }
      })
    : memberships.map((membership) => membership.tenant);
  const spacesPreview = tenants.slice(0, 5);

  const userName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
    currentUser?.name ||
    currentUser?.email ||
    '';

  return (
    <DashboardShell
      userName={userName}
      isClient={isClient}
      isAdmin={isAdmin}
      spacesPreview={spacesPreview}
      normalizeModules={normalizeModules}
      canCreateClients={canCreateClients(currentUser?.role)}
    >
      {children}
    </DashboardShell>
  );
}
