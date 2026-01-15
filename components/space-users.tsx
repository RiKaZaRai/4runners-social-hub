'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/toast';
import { isInviteExpired } from '@/lib/space-users';

type MemberRow = {
  id: string;
  role: 'viewer' | 'client_admin';
  user: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: string;
  };
};

type InviteRow = {
  id: string;
  email: string;
  role: 'viewer' | 'client_admin';
  expiresAt: string;
  acceptedAt: string | null;
};

type AgencyUserRow = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

type SpaceUsersResponse = {
  members: MemberRow[];
  invites: InviteRow[];
  availableAgencyUsers: AgencyUserRow[];
};

async function fetchUsers(spaceId: string) {
  const response = await fetch(`/api/spaces/${spaceId}/users`, { cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? 'Unable to load members');
  }
  return (await response.json()) as SpaceUsersResponse;
}

async function fetchCsrfToken() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('CSRF_FAILED');
  }
  const data = await response.json();
  if (typeof data.token !== 'string') {
    throw new Error('CSRF_FAILED');
  }
  return data.token as string;
}

function isAgencyRole(role: string): boolean {
  return ['agency_admin', 'agency_manager', 'agency_production'].includes(role);
}

export function SpaceUsers({ spaceId, canManage }: { spaceId: string; canManage: boolean }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'client_admin'>('viewer');
  const [selectedAgencyUserId, setSelectedAgencyUserId] = useState('');

  const query = useQuery({
    queryKey: ['space-users', spaceId],
    queryFn: () => fetchUsers(spaceId),
    refetchInterval: 15000
  });

  useEffect(() => {
    fetchCsrfToken()
      .then(setCsrfToken)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (query.error instanceof Error) {
      setToastMessage(query.error.message);
      setToastKey((prev) => prev + 1);
    }
  }, [query.error]);

  const members = query.data?.members ?? [];
  const invites = query.data?.invites ?? [];
  const availableAgencyUsers = query.data?.availableAgencyUsers ?? [];

  // Séparer les membres clients des membres agence
  const clientMembers = members.filter((m) => !isAgencyRole(m.user.role));
  const agencyMembers = members.filter((m) => isAgencyRole(m.user.role));

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: 'viewer' | 'client_admin' }) => {
      const token = csrfToken ?? (await fetchCsrfToken());
      if (!csrfToken) {
        setCsrfToken(token);
      }
      const response = await fetch(`/api/spaces/${spaceId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Impossible d\'envoyer l\'invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      setToastMessage('Invitation envoyée');
      setToastKey((prev) => prev + 1);
      query.refetch();
      setShowInviteModal(false);
      setInviteEmail('');
    },
    onError: (error) => {
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastKey((prev) => prev + 1);
    }
  });

  const addAgencyMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = csrfToken ?? (await fetchCsrfToken());
      if (!csrfToken) {
        setCsrfToken(token);
      }
      const response = await fetch(`/api/spaces/${spaceId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ userId, type: 'agency' })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Impossible d\'ajouter le membre agence');
      }

      return response.json();
    },
    onSuccess: () => {
      setToastMessage('Membre agence ajouté');
      setToastKey((prev) => prev + 1);
      query.refetch();
      setShowAgencyModal(false);
      setSelectedAgencyUserId('');
    },
    onError: (error) => {
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastKey((prev) => prev + 1);
    }
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'viewer' | 'client_admin' }) => {
      const token = csrfToken ?? (await fetchCsrfToken());
      if (!csrfToken) {
        setCsrfToken(token);
      }
      const response = await fetch(`/api/spaces/${spaceId}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Impossible de mettre à jour le rôle');
      }

      return response.json();
    },
    onSuccess: () => {
      query.refetch();
      setToastMessage('Rôle mis à jour');
      setToastKey((prev) => prev + 1);
    },
    onError: (error) => {
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastKey((prev) => prev + 1);
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = csrfToken ?? (await fetchCsrfToken());
      if (!csrfToken) {
        setCsrfToken(token);
      }
      const response = await fetch(`/api/spaces/${spaceId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': token
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Impossible de retirer le membre');
      }

      return response.json();
    },
    onSuccess: () => {
      query.refetch();
      setToastMessage('Membre retiré');
      setToastKey((prev) => prev + 1);
    },
    onError: (error) => {
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastKey((prev) => prev + 1);
    }
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const token = csrfToken ?? (await fetchCsrfToken());
      if (!csrfToken) {
        setCsrfToken(token);
      }
      const response = await fetch(`/api/spaces/${spaceId}/users?inviteId=${inviteId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': token
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Impossible de révoquer l\'invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      query.refetch();
      setToastMessage('Invitation révoquée');
      setToastKey((prev) => prev + 1);
    },
    onError: (error) => {
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastKey((prev) => prev + 1);
    }
  });

  const handleInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const handleAddAgencySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAgencyUserId) return;
    addAgencyMutation.mutate(selectedAgencyUserId);
  };

  const toastActive = toastMessage && toastKey > 0;

  return (
    <div className="space-y-6">
      {toastActive && (
        <Toast
          key={toastKey}
          message={toastMessage ?? ''}
          storageKey="toast:space-users"
        />
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gestion</p>
          <h2 className="text-2xl font-semibold">Utilisateurs de l'espace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invitez des membres et gérez leurs rôles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href={`/spaces/${spaceId}/overview`}>Retour à l'espace</Link>
          </Button>
          {canManage && (
            <>
              <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogTrigger asChild>
                  <Button size="sm">Inviter un client</Button>
                </DialogTrigger>
                <DialogContent className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Inviter un client</DialogTitle>
                    <DialogDescription>
                      Envoyez une invitation par email. Si l'utilisateur n'existe pas, il sera créé automatiquement.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Rôle</Label>
                      <select
                        id="invite-role"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(event.target.value as 'viewer' | 'client_admin')
                        }
                      >
                        <option value="viewer">Client user (lecture)</option>
                        <option value="client_admin">Client admin</option>
                      </select>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? 'Envoi...' : 'Envoyer'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {availableAgencyUsers.length > 0 && (
                <Dialog open={showAgencyModal} onOpenChange={setShowAgencyModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">Ajouter agence</Button>
                  </DialogTrigger>
                  <DialogContent className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Ajouter un membre agence</DialogTitle>
                      <DialogDescription>
                        Associez un membre de l'agence à cet espace pour qu'il puisse le gérer.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAgencySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="agency-user">Membre agence</Label>
                        <select
                          id="agency-user"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={selectedAgencyUserId}
                          onChange={(event) => setSelectedAgencyUserId(event.target.value)}
                          required
                        >
                          <option value="">Sélectionnez un membre</option>
                          {availableAgencyUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
                                user.name ||
                                user.email}{' '}
                              ({user.role.replace('agency_', '')})
                            </option>
                          ))}
                        </select>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowAgencyModal(false)}>
                          Annuler
                        </Button>
                        <Button type="submit" disabled={addAgencyMutation.isPending}>
                          {addAgencyMutation.isPending ? 'Ajout...' : 'Ajouter'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle>Invitations clients</CardTitle>
            <span className="text-xs text-muted-foreground">
              {invites.length} en attente
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune invitation.</p>
            ) : (
              invites.map((invite) => {
                const expired = isInviteExpired({ expiresAt: invite.expiresAt, acceptedAt: invite.acceptedAt });
                return (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {invite.role === 'client_admin' ? 'Client admin' : 'Client user'}
                        </Badge>
                        <span>•</span>
                        <span>
                          Expire le {new Date(invite.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                        {expired && <Badge variant="accent">Expirée</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {expired && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => inviteMutation.mutate({ email: invite.email, role: invite.role })}
                          disabled={inviteMutation.isPending}
                        >
                          Renvoyer
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Membres agence */}
      {agencyMembers.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle>Equipe agence</CardTitle>
            <span className="text-xs text-muted-foreground">
              {agencyMembers.length} membre(s)
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {agencyMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {[member.user.firstName, member.user.lastName].filter(Boolean).join(' ') ||
                      member.user.name ||
                      member.user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="accent" className="text-[10px] uppercase">
                      {member.user.role.replace('agency_', '')}
                    </Badge>
                    <span>{member.user.email}</span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeMutation.mutate(member.user.id)}
                      disabled={removeMutation.isPending}
                    >
                      Retirer
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Membres clients */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <CardTitle>Membres clients</CardTitle>
          <span className="text-xs text-muted-foreground">
            {clientMembers.length} membre(s)
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre client pour le moment.</p>
          ) : (
            clientMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {[member.user.firstName, member.user.lastName].filter(Boolean).join(' ') ||
                      member.user.name ||
                      member.user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={member.role === 'client_admin' ? 'accent' : 'outline'}>
                      {member.role === 'client_admin' ? 'Client admin' : 'Client user'}
                    </Badge>
                    {member.user.phone && <span>· {member.user.phone}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        roleMutation.mutate({
                          userId: member.user.id,
                          role: member.role === 'viewer' ? 'client_admin' : 'viewer'
                        })
                      }
                      disabled={roleMutation.isPending}
                    >
                      {member.role === 'viewer' ? '→ Client admin' : '→ Client user'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeMutation.mutate(member.user.id)}
                      disabled={removeMutation.isPending}
                    >
                      Retirer
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
