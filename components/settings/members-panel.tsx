'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/toast';

export type Member = {
  id: string;
  role: 'viewer' | 'client_admin';
  user: {
    id: string;
    name: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
};

export type AvailableUser = {
  id: string;
  name: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

interface MembersPanelProps {
  spaceId: string;
  members: Member[];
  availableUsers: AvailableUser[];
  isAdmin: boolean;
}

export function MembersPanel({
  spaceId,
  members: initialMembers,
  availableUsers: initialAvailable,
  isAdmin
}: MembersPanelProps) {
  const [members, setMembers] = useState(initialMembers);
  const [availableUsers, setAvailableUsers] = useState(initialAvailable);
  const [isAdding, setIsAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastKey((prev) => prev + 1);
  }, []);

  const getUserDisplayName = (user: { firstName: string | null; lastName: string | null; name: string | null; email: string }) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.name || user.email;
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userId = formData.get('userId') as string;
    const role = formData.get('role') as 'viewer' | 'client_admin';

    if (!userId || !role) return;

    setIsAdding(true);
    try {
      const res = await fetch(`/api/admin/tenants/${spaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });

      if (!res.ok) throw new Error('Erreur');

      const newMember = await res.json();
      setMembers((prev) => [newMember, ...prev]);
      setAvailableUsers((prev) => prev.filter((u) => u.id !== userId));
      form.reset();
      showToast('Membre ajoute');
    } catch {
      showToast('Erreur lors de l\'ajout');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: 'viewer' | 'client_admin') => {
    try {
      const res = await fetch(`/api/admin/tenants/${spaceId}/members/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error('Erreur');

      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === membershipId ? updated : m)));
      showToast('Role mis a jour');
    } catch {
      showToast('Erreur lors de la mise a jour');
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Retirer ce membre ?')) return;

    try {
      const res = await fetch(`/api/admin/tenants/${spaceId}/members/${membershipId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erreur');

      const removed = members.find((m) => m.id === membershipId);
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
      if (removed) {
        setAvailableUsers((prev) => [
          ...prev,
          {
            id: removed.user.id,
            name: removed.user.name,
            email: removed.user.email,
            firstName: removed.user.firstName,
            lastName: removed.user.lastName
          }
        ]);
      }
      showToast('Membre retire');
    } catch {
      showToast('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Member */}
      {availableUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ajouter un membre</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="flex flex-wrap gap-3">
              <select
                name="userId"
                className="h-9 flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Selectionner un utilisateur...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {getUserDisplayName(user)} ({user.email})
                  </option>
                ))}
              </select>
              <select
                name="role"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="viewer">Client user</option>
                <option value="client_admin">Client admin</option>
              </select>
              <Button type="submit" size="sm" disabled={isAdding}>
                {isAdding ? '...' : 'Ajouter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Membres actuels</CardTitle>
          <CardDescription>{members.length} membre(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre</p>
          ) : (
            <div className="space-y-2">
              {members.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {getUserDisplayName(membership.user)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {membership.user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {membership.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={membership.role === 'client_admin' ? 'accent' : 'default'}>
                      {membership.role === 'client_admin' ? 'Admin' : 'User'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateRole(
                          membership.id,
                          membership.role === 'viewer' ? 'client_admin' : 'viewer'
                        )
                      }
                    >
                      {membership.role === 'viewer' ? '→ Admin' : '→ User'}
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemoveMember(membership.id)}
                      >
                        Retirer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {toastMessage && toastKey > 0 && (
        <Toast message={toastMessage} storageKey={`members-toast-${toastKey}`} />
      )}
    </div>
  );
}
