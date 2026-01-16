import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyAdmin, isAgencyManager, isAgencyProduction, isClientRole } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';

// Social network icons with official brand colors
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#0A66C2"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <defs>
        <radialGradient id="ig-gradient" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <path
        fill="url(#ig-gradient)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
      />
    </svg>
  );
}

function WordPressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#21759B"
        d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.034 1.229-.1 1.229-.1.579-.068.51-.921-.068-.889 0 0-1.739.136-2.86.136-1.052 0-2.825-.136-2.825-.136-.579-.034-.646.855-.067.889 0 0 .549.066 1.13.1l1.677 4.597-2.357 7.066-3.923-11.664c.647-.034 1.229-.1 1.229-.1.579-.068.51-.921-.069-.889 0 0-1.738.136-2.859.136-.201 0-.438-.008-.69-.015C4.953 3.089 8.276 1.2 12 1.2c2.776 0 5.304 1.06 7.201 2.8-.046-.003-.091-.009-.141-.009-1.052 0-1.799.918-1.799 1.903 0 .884.51 1.633 1.052 2.517.408.714.884 1.633.884 2.958 0 .918-.354 1.983-.819 3.468l-1.073 3.585-3.89-11.592zm-6.69 14.063L3.5 9.869c.47 1.177.768 2.519.768 4.031 0 3.257 1.75 6.098 4.359 7.65-.195.199-.369.42-.5.682zM12 22.8C6.057 22.8 1.2 17.943 1.2 12S6.057 1.2 12 1.2 22.8 6.057 22.8 12 17.943 22.8 12 22.8m0-22.6C5.508.2.2 5.507.2 12S5.508 23.8 12 23.8 23.8 18.493 23.8 12 18.493.2 12 .2"
      />
    </svg>
  );
}

function GoogleMyBusinessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22 12l-10 9-3.5-3.5L12 14l6-5.5z" />
      <path fill="#34A853" d="M22 12l-6 5.5-4-3.5 6-5.5z" />
      <path fill="#FBBC05" d="M2 12l10-9 3.5 3.5L12 10 6 15.5z" />
      <path fill="#EA4335" d="M2 12l6-5.5 4 3.5-6 5.5z" />
      <circle fill="#4285F4" cx="12" cy="12" r="3" />
    </svg>
  );
}

// Icon components mapped by network value
const NETWORK_ICONS: Record<string, ReactNode> = {
  linkedin: <LinkedInIcon className="h-6 w-6" />,
  facebook: <FacebookIcon className="h-6 w-6" />,
  instagram: <InstagramIcon className="h-6 w-6" />,
  youtube: <YouTubeIcon className="h-6 w-6" />,
  tiktok: <TikTokIcon className="h-6 w-6" />,
  x: <XIcon className="h-6 w-6" />,
  wordpress: <WordPressIcon className="h-6 w-6" />,
  google_my_business: <GoogleMyBusinessIcon className="h-6 w-6" />
};

const SOCIAL_NETWORKS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'google_my_business', label: 'Google My Business' }
] as const;

export default async function TenantChannelsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || isAgencyProduction(user.role) || isClientRole(user.role)) {
    redirect('/spaces');
  }

  const isAdmin = isAgencyAdmin(user.role);
  const isManager = isAgencyManager(user.role);
  const membership = isManager
    ? await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: session.userId } }
      })
    : null;

  if (!isAdmin && !membership) {
    redirect('/spaces');
  }

  // Get tenant with channels
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      channels: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) {
    notFound();
  }

  // Filter out networks that are already added
  const availableNetworks = SOCIAL_NETWORKS.filter(
    (network) => !tenant.channels.some((c) => c.network === network.value)
  );

  async function addChannel(formData: FormData) {
    'use server';

    const tid = formData.get('tenantId') as string;
    const network = formData.get('network') as string;
    const handle = formData.get('handle') as string;
    const url = formData.get('url') as string;

    if (!network) {
      redirect(`/admin/${tid}/channels?error=network_required`);
    }

    try {
      await prisma.tenantChannel.create({
        data: {
          tenantId: tid,
          network: network as any,
          handle: handle || null,
          url: url || null
        }
      });

      redirect(`/admin/${tid}/channels`);
    } catch (error) {
      console.error('Error adding channel:', error);
      redirect(`/admin/${tid}/channels?error=add_failed`);
    }
  }

  async function updateChannel(formData: FormData) {
    'use server';

    const tid = formData.get('tenantId') as string;
    const channelId = formData.get('channelId') as string;
    const handle = formData.get('handle') as string;
    const url = formData.get('url') as string;

    if (!channelId) {
      redirect(`/admin/${tid}/channels?error=channel_id_required`);
    }

    try {
      await prisma.tenantChannel.update({
        where: { id: channelId },
        data: {
          handle: handle || null,
          url: url || null
        }
      });

      redirect(`/admin/${tid}/channels`);
    } catch (error) {
      console.error('Error updating channel:', error);
      redirect(`/admin/${tid}/channels?error=update_failed`);
    }
  }

  async function deleteChannel(formData: FormData) {
    'use server';

    const tid = formData.get('tenantId') as string;
    const channelId = formData.get('channelId') as string;

    if (!channelId) {
      redirect(`/admin/${tid}/channels?error=channel_id_required`);
    }

    try {
      await prisma.tenantChannel.delete({
        where: { id: channelId }
      });

      redirect(`/admin/${tid}/channels`);
    } catch (error) {
      console.error('Error deleting channel:', error);
      redirect(`/admin/${tid}/channels?error=delete_failed`);
    }
  }

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            href={`/admin/${tenantId}`}
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au client
          </Link>
          <h1 className="text-3xl font-semibold">Gérer les réseaux sociaux</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Réseaux sociaux de {tenant.name}
          </p>
        </div>

        {/* Add Channel */}
        {availableNetworks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un réseau social</CardTitle>
              <CardDescription>
                Connecter un nouveau réseau social à ce client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addChannel} className="space-y-4">
                <input type="hidden" name="tenantId" value={tenantId} />
                <div className="space-y-2">
                  <Label htmlFor="network">Réseau social</Label>
                  <select
                    id="network"
                    name="network"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Sélectionnez un réseau</option>
                    {availableNetworks.map((network) => (
                      <option key={network.value} value={network.value}>
                        {network.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="handle">Identifiant/Handle (optionnel)</Label>
                  <Input
                    id="handle"
                    name="handle"
                    type="text"
                    placeholder="Ex: @username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL (optionnel)</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="Ex: https://..."
                  />
                </div>

                <Button type="submit" className="w-full">
                  Ajouter le réseau
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Channels List */}
        <Card>
          <CardHeader>
            <CardTitle>Réseaux configurés</CardTitle>
            <CardDescription>
              {tenant.channels.length} réseau(x) configuré(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenant.channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun réseau configuré</p>
              ) : (
                tenant.channels.map((channel) => {
                  const networkInfo = SOCIAL_NETWORKS.find((n) => n.value === channel.network);
                  return (
                    <Card key={channel.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {NETWORK_ICONS[channel.network]}
                            <CardTitle className="text-lg">{networkInfo?.label}</CardTitle>
                            <Badge variant="outline">{channel.network}</Badge>
                          </div>
                          <form action={deleteChannel}>
                            <input type="hidden" name="tenantId" value={tenantId} />
                            <input type="hidden" name="channelId" value={channel.id} />
                            <Button type="submit" variant="destructive" size="sm">
                              Supprimer
                            </Button>
                          </form>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <form action={updateChannel} className="space-y-4">
                          <input type="hidden" name="tenantId" value={tenantId} />
                          <input type="hidden" name="channelId" value={channel.id} />

                          <div className="space-y-2">
                            <Label htmlFor={`handle-${channel.id}`}>Identifiant/Handle</Label>
                            <Input
                              id={`handle-${channel.id}`}
                              name="handle"
                              type="text"
                              defaultValue={channel.handle || ''}
                              placeholder="Ex: @username"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`url-${channel.id}`}>URL</Label>
                            <Input
                              id={`url-${channel.id}`}
                              name="url"
                              type="url"
                              defaultValue={channel.url || ''}
                              placeholder="Ex: https://..."
                            />
                          </div>

                          <Button type="submit" variant="outline" className="w-full">
                            Enregistrer les modifications
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
