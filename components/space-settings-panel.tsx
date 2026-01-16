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

// Social network icons
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
                <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                  <InstagramIcon className="h-4 w-4 text-[#E4405F]" />
                  Instagram
                </Label>
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
                <Label htmlFor="facebook_page" className="flex items-center gap-2">
                  <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
                  Facebook
                </Label>
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
                <Label htmlFor="linkedin_page" className="flex items-center gap-2">
                  <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
                  LinkedIn
                </Label>
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
