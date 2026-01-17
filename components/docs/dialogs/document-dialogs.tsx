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

// Sections disponibles pour les documents Wiki
const wikiSections = [
  { id: 'go-live', label: 'Go Live' },
  { id: 'urgence', label: 'Urgence' },
  { id: 'setup-projet', label: 'Setup projet' },
  { id: 'client', label: 'Client' },
  { id: 'outils', label: 'Outils' },
  { id: 'reference', label: 'References' }
];

interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  // Props pour Wiki avec sections et dossiers
  showSectionPicker?: boolean;
  selectedSection?: string;
  onSectionChange?: (section: string) => void;
  selectedFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  folders?: FolderWithChildren[];
}

// Helper pour vérifier si un dossier appartient à une section
function folderBelongsToSection(
  folder: FolderWithChildren,
  sectionId: string,
  sectionLabel: string
): boolean {
  return (
    folder.name.toUpperCase().startsWith(`[${sectionId.toUpperCase()}]`) ||
    folder.name.toUpperCase().includes(sectionLabel.toUpperCase())
  );
}

export function NewDocumentDialog({
  open,
  onOpenChange,
  inputValue,
  onInputChange,
  onSubmit,
  isPending,
  showSectionPicker = false,
  selectedSection,
  onSectionChange,
  selectedFolderId,
  onFolderChange,
  folders = []
}: NewDocumentDialogProps) {
  // Get folders for the selected section
  const sectionObj = wikiSections.find((s) => s.id === selectedSection);
  const sectionFolders = sectionObj
    ? folders.filter((f) => folderBelongsToSection(f, sectionObj.id, sectionObj.label))
    : [];

  const canSubmit = inputValue.trim() && (!showSectionPicker || selectedSection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau document</DialogTitle>
        </DialogHeader>

        {showSectionPicker && onSectionChange && (
          <div className="space-y-2">
            <Label>Section</Label>
            <div className="grid grid-cols-2 gap-2">
              {wikiSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    onSectionChange(section.id);
                    // Reset folder selection when changing section
                    onFolderChange?.(null);
                  }}
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

        {showSectionPicker && selectedSection && sectionFolders.length > 0 && onFolderChange && (
          <div className="space-y-2">
            <Label>Dossier (optionnel)</Label>
            <div className="grid gap-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
              <button
                type="button"
                onClick={() => onFolderChange(null)}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selectedFolderId === null
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                Racine de la section
              </button>
              {sectionFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onFolderChange(folder.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selectedFolderId === folder.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {folder.name.replace(/^\[.*?\]\s*/, '')}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Titre du document</Label>
          <Input
            placeholder="Titre du document"
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
