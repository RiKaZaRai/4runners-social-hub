import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canCreateClients, isAgencyAdmin, isClientRole } from '@/lib/roles';
import { normalizeModules } from '@/lib/modules';
import { DashboardShell } from '@/components/navigation';
import { getFoldersAndDocuments } from '@/lib/actions/documents';

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

  // Pre-compute modules on server side to avoid passing functions to client
  const spacesPreview = tenants.slice(0, 5).map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    modules: normalizeModules(tenant.modules)
  }));

  const userName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
    currentUser?.name ||
    currentUser?.email ||
    '';

  // Load wiki data for global secondary sidebar (only for non-clients)
  let wikiData = null;
  if (!isClient) {
    try {
      wikiData = await getFoldersAndDocuments(null);
    } catch (error) {
      // Fail silently if wiki data can't be loaded
      console.error('Failed to load wiki data for global sidebar:', error);
    }
  }

  return (
    <DashboardShell
      userName={userName}
      isClient={isClient}
      isAdmin={isAdmin}
      spacesPreview={spacesPreview}
      canCreateClients={canCreateClients(currentUser?.role)}
      wikiData={wikiData}
    >
      {children}
    </DashboardShell>
  );
}
