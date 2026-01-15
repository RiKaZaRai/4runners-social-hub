import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SpaceMessages } from '@/components/space-messages';
import { isAgencyRole, isClientRole } from '@/lib/roles';

export default async function SpaceMessagesPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const isClient = isClientRole(currentUser.role);
  const isAgency = isAgencyRole(currentUser.role);

  if (!isClient && !isAgency) {
    redirect('/spaces');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, active: true }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  if (isClient) {
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: id,
          userId: session.userId
        }
      }
    });

    if (!membership) {
      redirect('/spaces');
    }

    if (!tenant.active) {
      redirect('/spaces');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/spaces/${tenant.id}/overview`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l'espace
        </Link>
        <h2 className="text-2xl font-semibold">Messages - {tenant.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Echangez rapidement entre l'agence et le client.
        </p>
      </div>

      <SpaceMessages spaceId={id} />
    </div>
  );
}
