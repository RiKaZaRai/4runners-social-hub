import Link from 'next/link';
import { Building2, Link2 } from 'lucide-react';
import { NavLink } from '@/components/nav-link';
import { WikiNavLink } from '@/components/wiki/wiki-nav-link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CsrfInput } from '@/components/csrf-input';
import { ThemeToggle } from '@/components/theme-toggle';
import { canCreateClients, isAgencyAdmin, isClientRole } from '@/lib/roles';
import { normalizeModules } from '@/lib/modules';

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto bg-secondary/60">
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">4runners</p>
            <h1 className="text-lg font-semibold">Social Hub</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
                currentUser?.name ||
                currentUser?.email}
            </p>
          </div>

          <nav className="flex-1 space-y-6 px-4 py-5 text-sm">
            {/* Menu principal - usage quotidien uniquement */}
            <div className="space-y-1">
              <NavLink href="/home" icon="home">
                Accueil
              </NavLink>
              <NavLink href="/inbox" icon="inbox">
                Inbox
              </NavLink>
              <NavLink href={isClient ? '/posts' : '/spaces'} icon="building">
                Espaces
              </NavLink>
              {!isClient && <WikiNavLink />}
            </div>

            {/* Section Espaces */}
            <div className="rounded-xl bg-muted/30 px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Espaces
                </p>
                {canCreateClients(currentUser?.role) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/spaces/new">Nouveau</Link>
                  </Button>
                )}
              </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {spacesPreview.map((space) => {
                    const modules = normalizeModules(space.modules);
                    const hasSocial = modules.includes('social');
                    return (
                      <li key={space.id}>
                        <Link
                          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
                          href={`/spaces/${space.id}/overview`}
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{space.name}</span>
                        </Link>
                        {hasSocial && (
                          <Link
                            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            href={`/spaces/${space.id}/social`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Réseaux
                          </Link>
                        )}
                      </li>
                    );
                  })}
                {spacesPreview.length === 0 && (
                  <li className="rounded-md bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
                    Aucun espace.
                  </li>
                )}
              </ul>
              {tenants.length > 0 && (
                <Link
                  href="/spaces"
                  className="mt-3 block text-xs text-muted-foreground hover:text-foreground"
                >
                  Voir tous les espaces →
                </Link>
              )}
            </div>

            {/* Parametres - admin only */}
            {isAdmin && (
              <div className="space-y-1">
                <p className="px-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Administration
                </p>
                <NavLink href="/settings" icon="settings">
                  Parametres
                </NavLink>
              </div>
            )}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between bg-card/80 px-6 py-4">
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
