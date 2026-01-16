'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/toast';

interface DangerZonePanelProps {
  spaceId: string;
  tenantName: string;
  isAdmin: boolean;
}

export function DangerZonePanel({ spaceId, tenantName, isAdmin }: DangerZonePanelProps) {
  const router = useRouter();
  const [name, setName] = useState(tenantName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastKey((prev) => prev + 1);
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      if (!res.ok) throw new Error('Erreur');

      showToast('Nom mis a jour');
      router.refresh();
    } catch {
      showToast('Erreur lors de la mise a jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer definitivement "${tenantName}" et toutes ses donnees ?`)) return;
    if (!confirm('Cette action est irreversible. Confirmer ?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${spaceId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erreur');

      router.push('/spaces');
    } catch {
      showToast('Erreur lors de la suppression');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Edit Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nom du client</Label>
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du client"
                required
              />
            </div>
            <Button type="submit" disabled={isSaving || name === tenantName}>
              {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isAdmin && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Zone de danger</CardTitle>
            <CardDescription>Actions irreversibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Supprimer ce client</p>
                <p className="text-sm text-muted-foreground">
                  Supprime definitivement le client et toutes ses donnees
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {toastMessage && toastKey > 0 && (
        <Toast message={toastMessage} storageKey={`danger-toast-${toastKey}`} />
      )}
    </div>
  );
}
