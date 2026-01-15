import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SpaceSettingsPanel, SocialSettings } from '@/components/space-settings-panel';
import { isAgencyAdmin, isAgencyManager } from '@/lib/roles';
import { AVAILABLE_SPACE_MODULES, getSpaceModules, SpaceModuleName } from '@/lib/modules';

export default async function SpaceSettingsPage({
  params
}: {
  params: { id: string };
}) {
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
    where: { id: params.id },
    select: {
      modules: true,
      socialSettings: true
    }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  const modulesList = await getSpaceModules(params.id);
  const socialSettings: SocialSettings = {
    instagram_handle: tenant.socialSettings?.instagram_handle ?? null,
    facebook_page: tenant.socialSettings?.facebook_page ?? null,
    linkedin_page: tenant.socialSettings?.linkedin_page ?? null,
    note: tenant.socialSettings?.note ?? null
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
        spaceId={params.id}
        modules={modulesList.reduce<Record<string, boolean>>((acc, moduleName) => {
          acc[moduleName] = true;
          return acc;
        }, {
          messages: false,
          social: false,
          docs: false,
          projects: false,
          planning: false
        } as Record<string, boolean>) as Record<any, boolean>}
        socialSettings={socialSettings}
        canManageModules={isAdmin || isManager}
      />
    </div>
  );
}
