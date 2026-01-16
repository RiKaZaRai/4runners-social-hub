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

const SOCIAL_NETWORKS = [
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'youtube', label: 'YouTube', icon: '📺' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'x', label: 'X (Twitter)', icon: '🐦' },
  { value: 'wordpress', label: 'WordPress', icon: '📝' },
  { value: 'google_my_business', label: 'Google My Business', icon: '🏢' }
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
                        {network.icon} {network.label}
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
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{networkInfo?.icon}</span>
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
