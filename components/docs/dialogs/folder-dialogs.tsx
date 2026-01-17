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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FolderWithChildren } from '@/lib/actions/documents';

// Sections disponibles pour les dossiers Wiki
const wikiSections = [
  { id: 'go-live', label: 'GO-LIVE' },
  { id: 'urgence', label: 'URGENCE' },
  { id: 'setup-projet', label: 'SETUP PROJET' },
  { id: 'client', label: 'CLIENT' },
  { id: 'outils', label: 'OUTILS' },
  { id: 'reference', label: 'REFERENCE' },
];

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  // Props optionnels pour Wiki avec sections
  selectedSection?: string;
  onSectionChange?: (section: string) => void;
  showSectionPicker?: boolean;
}

export function NewFolderDialog({
  open,
  onOpenChange,
  inputValue,
  onInputChange,
  onSubmit,
  isPending,
  selectedSection,
  onSectionChange,
  showSectionPicker = false
}: NewFolderDialogProps) {
  const canSubmit = inputValue.trim() && (!showSectionPicker || selectedSection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
        </DialogHeader>

        {showSectionPicker && onSectionChange && (
          <div className="space-y-2">
            <Label>Section</Label>
            <div className="grid grid-cols-2 gap-2">
              {wikiSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                    selectedSection === section.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Nom du dossier</Label>
          <Input
            placeholder="Nom du dossier"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && onSubmit()}
            autoFocus={!showSectionPicker}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !canSubmit}>
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
