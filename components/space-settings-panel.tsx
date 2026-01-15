'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Toast } from '@/components/toast';
import { SpaceModuleName, AVAILABLE_SPACE_MODULES } from '@/lib/modules';

export type SocialSettings = {
  instagram_handle?: string | null;
  facebook_page?: string | null;
  linkedin_page?: string | null;
  note?: string | null;
};

const MODULE_DETAILS: Record<SpaceModuleName, { label: string; description: string }> = {
  messages: {
    label: 'Messagerie',
    description: 'Ouvre la boîte inbox dédiée aux alertes et messages clients.'
  },
  social: {
    label: 'Social',
    description: 'Active les workflows post / validation pour les réseaux.'
  },
  docs: {
    label: 'Docs',
    description: 'Permet la gestion et validation de documents.'
  },
  projects: {
    label: 'Projets',
    description: 'Suivi des plans et jalons pour chaque client.'
  },
  planning: {
    label: 'Planning',
    description: 'Permet la visualisation des calendriers éditoriaux.'
  }
};

interface SpaceSettingsPanelProps {
  spaceId: string;
  modules: Record<SpaceModuleName, boolean>;
  socialSettings: SocialSettings;
  canManageModules: boolean;
}

export function SpaceSettingsPanel({
  spaceId,
  modules: initialModules,
  socialSettings,
  canManageModules
}: SpaceSettingsPanelProps) {
  const [modules, setModules] = useState(initialModules);
  const [handles, setHandles] = useState({
    instagram_handle: socialSettings.instagram_handle ?? '',
    facebook_page: socialSettings.facebook_page ?? '',
    linkedin_page: socialSettings.linkedin_page ?? ''
  });
  const [note, setNote] = useState(socialSettings.note ?? '');
  const [isSavingModule, setIsSavingModule] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const configuredCount = useMemo(() => {
    return ['instagram_handle', 'facebook_page', 'linkedin_page'].filter(
      (key) => handles[key as keyof typeof handles]?.trim()
    ).length;
  }, [handles]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastKey((prev) => prev + 1);
  }, []);

  const updateModules = useCallback(
    async (moduleName: SpaceModuleName, value: boolean) => {
      setIsSavingModule(true);
      try {
        const response = await fetch(`/api/spaces/${spaceId}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: { [moduleName]: value } })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Erreur' }));
          throw new Error(data.error ?? 'Impossible de sauvegarder');
        }

        const data = await response.json();
        const serverModules: string[] = data.modules ?? [];
        setModules(
          AVAILABLE_SPACE_MODULES.reduce<Record<SpaceModuleName, boolean>>((acc, module) => {
            acc[module] = serverModules.includes(module);
            return acc;
          }, {} as Record<SpaceModuleName, boolean>)
        );
        showToast('Module mis à jour');
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : 'Erreur');
      } finally {
        setIsSavingModule(false);
      }
    },
    [spaceId, showToast, modules]
  );

  const handleSocialSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSavingSocial(true);
      try {
        const response = await fetch(`/api/spaces/${spaceId}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socialSettings: {
              instagram_handle: handles.instagram_handle,
              facebook_page: handles.facebook_page,
              linkedin_page: handles.linkedin_page,
              note
            }
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Erreur' }));
          throw new Error(data.error ?? 'Impossible de sauvegarder');
        }

        showToast('Paramètres réseaux sauvegardés');
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : 'Erreur');
      } finally {
        setIsSavingSocial(false);
      }
    },
    [handles, note, showToast, spaceId]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modules activés</CardTitle>
          <p className="text-xs text-muted-foreground">
            Activez ou désactivez les fonctions utilisée pour cet espace.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {AVAILABLE_SPACE_MODULES.map((moduleName) => {
            const details = MODULE_DETAILS[moduleName];
            const enabled = Boolean(modules[moduleName]);

            return (
              <div
                key={moduleName}
                className="flex flex-col gap-2 rounded-md border border-border px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{details.label}</p>
                    <p className="text-xs text-muted-foreground">{details.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-full border px-3 py-1 cursor-pointer text-sm">
                    <span>{enabled ? 'Activé' : 'Désactivé'}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={!canManageModules || isSavingModule}
                      onChange={(event) => updateModules(moduleName, event.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Réseaux (statut)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Stockez les handles et note interne pour vos réseaux sociaux.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase">
              {configuredCount}/3 configurés
            </Badge>
          </div>
          <form className="space-y-4" onSubmit={handleSocialSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram_handle">Instagram</Label>
                <Input
                  id="instagram_handle"
                  placeholder="@votrecompte"
                  value={handles.instagram_handle}
                  onChange={(event) =>
                    setHandles((prev) => ({ ...prev, instagram_handle: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_page">Facebook</Label>
                <Input
                  id="facebook_page"
                  placeholder="Page Facebook"
                  value={handles.facebook_page}
                  onChange={(event) =>
                    setHandles((prev) => ({ ...prev, facebook_page: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="linkedin_page">LinkedIn</Label>
                <Input
                  id="linkedin_page"
                  placeholder="Page LinkedIn"
                  value={handles.linkedin_page}
                  onChange={(event) =>
                    setHandles((prev) => ({ ...prev, linkedin_page: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note interne</Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Indiquez des remarques ou contraintes internes"
              />
            </div>
            <Button type="submit" disabled={isSavingSocial}>
              {isSavingSocial ? 'Sauvegarde...' : 'Sauvegarder les réseaux'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {toastMessage && toastKey > 0 && (
        <Toast message={toastMessage} storageKey={`space-settings-toast-${toastKey}`} />
      )}
    </div>
  );
}
