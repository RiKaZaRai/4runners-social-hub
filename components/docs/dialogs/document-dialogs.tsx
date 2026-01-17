'use client';

import { Folder } from 'lucide-react';
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
import { wikiSections } from '@/lib/wiki-sections';
import type { FolderWithChildren } from '@/lib/actions/documents';

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
              {wikiSections.map((section) => {
                const Icon = section.icon;
                const isSelected = selectedSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      onSectionChange(section.id);
                      // Reset folder selection when changing section
                      onFolderChange?.(null);
                    }}
                    className={cn(
                      'group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
                      isSelected
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    <span className="flex-1">{section.label}</span>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showSectionPicker && selectedSection && sectionFolders.length > 0 && onFolderChange && (
          <div className="space-y-2">
            <Label>Dossier (optionnel)</Label>
            <div className="grid gap-1 max-h-40 overflow-y-auto rounded-xl border border-border p-2">
              <button
                type="button"
                onClick={() => onFolderChange(null)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selectedFolderId === null
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <span className="flex-1">Racine de la section</span>
                {selectedFolderId === null && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
              {sectionFolders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => onFolderChange(folder.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Folder className={cn('h-3.5 w-3.5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="flex-1">{folder.name.replace(/^\[.*?\]\s*/, '')}</span>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
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
