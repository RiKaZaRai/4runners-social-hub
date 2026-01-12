import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { CsrfInput } from '@/components/csrf-input';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });
  const isClient = currentUser?.role === 'client';
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.userId },
    include: { tenant: true }
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">4runners</p>
            <h1 className="text-lg font-semibold">Social Hub</h1>
          </div>
          <form action="/api/auth/logout" method="post">
            <CsrfInput />
            <Button variant="outline" size="sm">Se deconnecter</Button>
          </form>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-[220px_1fr] gap-6 px-6 py-8">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Comptes</p>
            <ul className="mt-2 space-y-2 text-sm">
              {memberships.map((membership) => (
                <li key={membership.id}>
                  <Link className="text-primary hover:underline" href={`/posts?tenantId=${membership.tenantId}`}>
                    {membership.tenant.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <nav className="space-y-2 text-sm">
            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/posts">
              Posts
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/ideas">
              Idees
            </Link>
            {!isClient && (
              <>
                <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/clients">
                  Clients
                </Link>
                <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/jobs">
                  Jobs / erreurs
                </Link>
              </>
            )}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
