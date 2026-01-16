'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpaceSettingsPanel, SocialSettings } from '@/components/space-settings-panel';
import { ChannelsPanel, Channel } from '@/components/settings/channels-panel';
import { MembersPanel, Member, AvailableUser } from '@/components/settings/members-panel';
import { DangerZonePanel } from '@/components/settings/danger-zone-panel';
import { SpaceModuleName } from '@/lib/modules';

interface SpaceSettingsTabsProps {
  spaceId: string;
  tenantName: string;
  modules: Record<SpaceModuleName, boolean>;
  socialSettings: SocialSettings;
  channels: Channel[];
  members: Member[];
  availableUsers: AvailableUser[];
  isAdmin: boolean;
  canManageModules: boolean;
}

export function SpaceSettingsTabs({
  spaceId,
  tenantName,
  modules,
  socialSettings,
  channels,
  members,
  availableUsers,
  isAdmin,
  canManageModules
}: SpaceSettingsTabsProps) {
  return (
    <Tabs defaultValue="modules" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="modules">Modules</TabsTrigger>
        <TabsTrigger value="channels">Reseaux</TabsTrigger>
        <TabsTrigger value="members">Membres</TabsTrigger>
        {isAdmin && <TabsTrigger value="settings">Client</TabsTrigger>}
      </TabsList>

      <TabsContent value="modules">
        <SpaceSettingsPanel
          spaceId={spaceId}
          modules={modules}
          socialSettings={socialSettings}
          canManageModules={canManageModules}
        />
      </TabsContent>

      <TabsContent value="channels">
        <ChannelsPanel spaceId={spaceId} channels={channels} />
      </TabsContent>

      <TabsContent value="members">
        <MembersPanel
          spaceId={spaceId}
          members={members}
          availableUsers={availableUsers}
          isAdmin={isAdmin}
        />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="settings">
          <DangerZonePanel
            spaceId={spaceId}
            tenantName={tenantName}
            isAdmin={isAdmin}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
