import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAgencyAdmin } from '@/lib/roles';
import { Users, AlertTriangle, Link2, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const session = await requireSession();
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser || !isAgencyAdmin(currentUser.role)) {
    redirect('/home');
  }

  const settingsItems = [
    {
      title: 'Equipes',
      description: 'Gerer les equipes et leurs membres',
      href: '/teams',
      icon: Users
    },
    {
      title: 'Utilisateurs',
      description: 'Gerer les comptes utilisateurs',
      href: '/settings/users',
      icon: Users
    },
    {
      title: 'Jobs / erreurs',
      description: 'Surveiller les taches en arriere-plan',
      href: '/jobs',
      icon: AlertTriangle
    },
    {
      title: 'Integrations',
      description: 'Configurer les connexions externes',
      href: '/settings/integrations',
      icon: Link2
    },
    {
      title: 'Securite',
      description: 'Parametres de securite et audit',
      href: '/settings/security',
      icon: Shield
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
        <h2 className="text-2xl font-semibold">Parametres</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Configurez votre espace de travail et gerez les acces.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
