'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { restoreVersion } from '@/lib/actions/documents';

interface Version {
  id: string;
  title: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface VersionHistoryProps {
  versions: Version[];
  currentDocId: string;
}

export function VersionHistory({ versions, currentDocId }: VersionHistoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRestore = async () => {
    if (!selectedVersion) return;

    startTransition(async () => {
      await restoreVersion(selectedVersion.id);
      setShowConfirm(false);
      setShowDialog(false);
      router.refresh();
    });
  };

  const openRestoreConfirm = (version: Version) => {
    setSelectedVersion(version);
    setShowConfirm(true);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <History className="mr-2 h-4 w-4" />
        Historique
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Historique des versions</DialogTitle>
          </DialogHeader>

          {versions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Pas encore de versions.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{version.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(version.createdAt)} par{' '}
                      {version.createdBy?.name || version.createdBy?.email || 'Inconnu'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRestoreConfirm(version)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restaurer
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer cette version ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Le document sera remplace par le contenu de la version du{' '}
            {selectedVersion && formatDate(selectedVersion.createdAt)}.
            Vous pourrez toujours revenir en arriere.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Annuler
            </Button>
            <Button onClick={handleRestore} disabled={isPending}>
              {isPending ? 'Restauration...' : 'Restaurer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
