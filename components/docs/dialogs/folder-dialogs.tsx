'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { FolderWithChildren } from '@/lib/actions/documents';

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function NewFolderDialog({
  open,
  onOpenChange,
  inputValue,
  onInputChange,
  onSubmit,
  isPending
}: NewFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Nom du dossier"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !inputValue.trim()}>
            Creer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  inputValue,
  onInputChange,
  onSubmit,
  isPending
}: RenameFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer le dossier</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Nouveau nom"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !inputValue.trim()}>
            Renommer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderWithChildren | null;
  document: { title: string } | null;
  onDeleteFolder: () => void;
  onDeleteDocument: () => void;
  isPending: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  folder,
  document,
  onDeleteFolder,
  onDeleteDocument,
  isPending
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {folder
            ? `Voulez-vous supprimer le dossier "${folder.name}" et tout son contenu ?`
            : document
              ? `Voulez-vous supprimer le document "${document.title}" ?`
              : ''}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="default"
            onClick={folder ? onDeleteFolder : onDeleteDocument}
            disabled={isPending}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
