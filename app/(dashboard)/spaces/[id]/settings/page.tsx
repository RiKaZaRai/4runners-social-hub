import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SpaceSettingsPanel, SocialSettings } from '@/components/space-settings-panel';
import { isAgencyAdmin, isAgencyManager } from '@/lib/roles';
import { AVAILABLE_SPACE_MODULES, SpaceModuleName } from '@/lib/modules';
import { getSpaceModules } from '@/lib/modules.server';

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
    select: {
      modules: true,
      socialSettings: true
    }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  const modulesList = await getSpaceModules(spaceId);
  const socialSettingsRaw = tenant.socialSettings as SocialSettings | null;
  const socialSettings: SocialSettings = {
    instagram_handle: socialSettingsRaw?.instagram_handle ?? null,
    facebook_page: socialSettingsRaw?.facebook_page ?? null,
    linkedin_page: socialSettingsRaw?.linkedin_page ?? null,
    note: socialSettingsRaw?.note ?? null
  };

  const moduleState = AVAILABLE_SPACE_MODULES.reduce<Record<SpaceModuleName, boolean>>(
    (acc, moduleName) => {
      acc[moduleName] = modulesList.includes(moduleName);
      return acc;
    },
    {} as Record<SpaceModuleName, boolean>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paramètres</p>
        <h2 className="text-2xl font-semibold">Modules & Réseaux</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Activez les modules pertinents et centralisez vos handles réseaux.
        </p>
      </div>

      <SpaceSettingsPanel
        spaceId={spaceId}
        modules={moduleState}
        socialSettings={socialSettings}
        canManageModules={isAdmin || isManager}
      />
    </div>
  );
}
