import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyAdmin } from '@/lib/roles';
import { ArrowLeft } from 'lucide-react';

export default async function IntegrationsSettingsPage() {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser || !isAgencyAdmin(currentUser.role)) {
    redirect('/home');
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Parametres
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configurez les connexions avec les services externes.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-muted-foreground">Aucune integration configuree.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Les integrations avec les reseaux sociaux seront disponibles prochainement.
        </p>
      </div>
    </div>
  );
}
