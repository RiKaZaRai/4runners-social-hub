import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyAdmin, isAgencyManager, isClientRole } from '@/lib/roles';
import { AVAILABLE_SPACE_MODULES, SpaceModuleName } from '@/lib/modules';
import { getSpaceModules } from '@/lib/modules.server';
import { ArrowLeft } from 'lucide-react';
import { SpaceSettingsTabs } from '@/components/settings/space-settings-tabs';
import type { SocialSettings } from '@/components/space-settings-panel';
import type { Channel } from '@/components/settings/channels-panel';
import type { Member, AvailableUser } from '@/components/settings/members-panel';

export default async function SpaceSettingsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: spaceId } = await params;
  const session = await requireSession();

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = isAgencyAdmin(currentUser.role);
  const isManager = isAgencyManager(currentUser.role);

  if (!isAdmin && !isManager) {
    redirect('/spaces');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: spaceId },
    include: {
      channels: {
        orderBy: { createdAt: 'desc' }
      },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  // Get modules state
  const modulesList = await getSpaceModules(spaceId);
  const moduleState = AVAILABLE_SPACE_MODULES.reduce<Record<SpaceModuleName, boolean>>(
    (acc, moduleName) => {
      acc[moduleName] = modulesList.includes(moduleName);
      return acc;
    },
    {} as Record<SpaceModuleName, boolean>
  );

  // Social settings
  const socialSettingsRaw = tenant.socialSettings as SocialSettings | null;
  const socialSettings: SocialSettings = {
    instagram_handle: socialSettingsRaw?.instagram_handle ?? null,
    facebook_page: socialSettingsRaw?.facebook_page ?? null,
    linkedin_page: socialSettingsRaw?.linkedin_page ?? null,
    note: socialSettingsRaw?.note ?? null
  };

  // Available users for member addition
  const allUsers = await prisma.user.findMany({
    where: { role: { in: ['client_admin', 'client_user'] } },
    select: {
      id: true,
      name: true,
      email: true,
      firstName: true,
      lastName: true
    },
    orderBy: { email: 'asc' }
  });

  const availableUsers: AvailableUser[] = allUsers.filter(
    (u) => !tenant.memberships.some((m) => m.userId === u.id)
  );

  // Format channels and members for client components
  const channels: Channel[] = tenant.channels.map((c) => ({
    id: c.id,
    network: c.network,
    handle: c.handle,
    url: c.url
  }));

  const members: Member[] = tenant.memberships.map((m) => ({
    id: m.id,
    role: m.role as 'viewer' | 'client_admin',
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.user.role
    }
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/spaces/${spaceId}/overview`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <h1 className="text-2xl font-semibold">Parametres</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tenant.name}</p>
      </div>

      <SpaceSettingsTabs
        spaceId={spaceId}
        tenantName={tenant.name}
        modules={moduleState}
        socialSettings={socialSettings}
        channels={channels}
        members={members}
        availableUsers={availableUsers}
        isAdmin={isAdmin}
        canManageModules={isAdmin || isManager}
      />
    </div>
  );
}
