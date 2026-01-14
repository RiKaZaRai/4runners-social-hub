import Link from 'next/link';
import { AlertTriangle, Building2, Home, Inbox, Users } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CsrfInput } from '@/components/csrf-input';
import { ThemeToggle } from '@/components/theme-toggle';
import { canCreateClients, isAgencyAdmin, isAgencyRole, isClientRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, name: true, email: true, firstName: true, lastName: true }
  });
  const isClient = isClientRole(currentUser?.role);
  const isAgency = isAgencyRole(currentUser?.role);
  const isAdmin = isAgencyAdmin(currentUser?.role);
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.userId },
    include: { tenant: true }
  });
  const tenants = isAdmin
    ? await prisma.tenant.findMany({ orderBy: { name: 'asc' } })
    : memberships.map((membership) => membership.tenant);
  const spacesPreview = tenants.slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="flex w-64 flex-col border-r border-border bg-card/60">
          <div className="border-b border-border px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">4runners</p>
            <h1 className="text-lg font-semibold">Social Hub</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
                currentUser?.name ||
                currentUser?.email}
            </p>
          </div>

          <nav className="flex-1 space-y-6 px-4 py-5 text-sm">
            <div className="space-y-1">
              <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted" href="/home">
                <Home className="h-4 w-4" />
                Accueil
              </Link>
              <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted" href="/inbox">
                <Inbox className="h-4 w-4" />
                Inbox
              </Link>
              <Link
                className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted"
                href={isClient ? '/posts' : '/spaces'}
              >
                <Building2 className="h-4 w-4" />
                Espaces
              </Link>
              {isAdmin && (
                <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted" href="/teams">
                  <Users className="h-4 w-4" />
                  Equipes
                </Link>
              )}
              {isAgency && (
                <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted" href="/jobs">
                  <AlertTriangle className="h-4 w-4" />
                  Jobs / erreurs
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Espaces
                </p>
                <Link
                  className="text-xs font-medium text-primary hover:underline"
                  href="/spaces"
                >
                  Voir tous
                </Link>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {spacesPreview.map((space) => (
                  <li key={space.id}>
                    <Link
                      className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
                      href={`/spaces/${space.id}/overview`}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{space.name}</span>
                    </Link>
                  </li>
                ))}
                {spacesPreview.length === 0 && (
                  <li className="rounded-md border border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
                    Aucun espace.
                  </li>
                )}
              </ul>
              <div className="mt-2 text-xs text-muted-foreground">
                <Link className="text-primary hover:underline" href="/spaces">
                  Voir tous les espaces →
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Comptes
                </p>
                {canCreateClients(currentUser?.role) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/new-tenant">Nouveau</Link>
                  </Button>
                )}
              </div>
              <ul className="mt-3 space-y-3 text-sm">
                {tenants.map((tenant) => (
                  <li key={tenant.id} className="space-y-1">
                    <Link
                      className="block rounded-md px-2 py-1 text-primary hover:bg-muted"
                      href={`/posts?tenantId=${tenant.id}`}
                    >
                      {tenant.name}
                    </Link>
                    <div className="flex gap-3 px-2 text-xs text-muted-foreground">
                      <Link className="hover:text-foreground" href={`/posts?tenantId=${tenant.id}`}>
                        Posts
                      </Link>
                      <Link className="hover:text-foreground" href={`/ideas?tenantId=${tenant.id}`}>
                        Idees
                      </Link>
                    </div>
                  </li>
                ))}
                {tenants.length === 0 && (
                  <li className="rounded-md border border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
                    Aucun client pour le moment.
                  </li>
                )}
              </ul>
            </div>
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <Input
                className="w-[280px] rounded-full bg-background"
                placeholder="Rechercher..."
              />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <form action="/api/auth/logout" method="post">
                <CsrfInput />
                <Button variant="outline" size="sm">
                  Se deconnecter
                </Button>
              </form>
            </div>
          </header>
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
