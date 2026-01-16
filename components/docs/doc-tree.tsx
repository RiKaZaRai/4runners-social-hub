'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  createFolder,
  createDocument,
  renameFolder,
  deleteFolder,
  deleteDocument,
  type FolderWithChildren,
  type DocumentSummary
} from '@/lib/actions/documents';

interface DocTreeProps {
  tenantId: string | null;
  folders: FolderWithChildren[];
  documents: DocumentSummary[];
  currentDocId?: string;
  basePath: string;
}

export function DocTree({
  tenantId,
  folders,
  documents,
  currentDocId,
  basePath
}: DocTreeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Dialog states
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderWithChildren | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSummary | null>(null);
  const [inputValue, setInputValue] = useState('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getDocumentsInFolder = (folderId: string | null) => {
    return documents.filter((d) => d.folderId === folderId);
  };

  const handleCreateFolder = async () => {
    if (!inputValue.trim()) return;
    startTransition(async () => {
      await createFolder(tenantId, targetParentId, inputValue);
      setShowNewFolderDialog(false);
      setInputValue('');
      router.refresh();
    });
  };

  const handleCreateDocument = async () => {
    if (!inputValue.trim()) return;
    startTransition(async () => {
      const doc = await createDocument(tenantId, targetParentId, inputValue);
      setShowNewDocDialog(false);
      setInputValue('');
      router.push(`${basePath}/${doc.id}/edit`);
    });
  };

  const handleRenameFolder = async () => {
    if (!inputValue.trim() || !selectedFolder) return;
    startTransition(async () => {
      await renameFolder(selectedFolder.id, inputValue);
      setShowRenameDialog(false);
      setInputValue('');
      setSelectedFolder(null);
      router.refresh();
    });
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    startTransition(async () => {
      await deleteFolder(selectedFolder.id);
      setShowDeleteDialog(false);
      setSelectedFolder(null);
      router.refresh();
    });
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;
    startTransition(async () => {
      await deleteDocument(selectedDoc.id);
      setShowDeleteDialog(false);
      setSelectedDoc(null);
      router.refresh();
    });
  };

  const openNewFolderDialog = (parentId: string | null, depth: number) => {
    if (depth >= 2) return; // Max 3 levels
    setTargetParentId(parentId);
    setInputValue('');
    setShowNewFolderDialog(true);
  };

  const openNewDocDialog = (folderId: string | null) => {
    setTargetParentId(folderId);
    setInputValue('');
    setShowNewDocDialog(true);
  };

  const openRenameDialog = (folder: FolderWithChildren) => {
    setSelectedFolder(folder);
    setInputValue(folder.name);
    setShowRenameDialog(true);
  };

  const openDeleteFolderDialog = (folder: FolderWithChildren) => {
    setSelectedFolder(folder);
    setSelectedDoc(null);
    setShowDeleteDialog(true);
  };

  const openDeleteDocDialog = (doc: DocumentSummary) => {
    setSelectedDoc(doc);
    setSelectedFolder(null);
    setShowDeleteDialog(true);
  };

  const renderFolder = (folder: FolderWithChildren, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const docsInFolder = getDocumentsInFolder(folder.id);
    const hasChildren = folder.children.length > 0 || docsInFolder.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted',
            'cursor-pointer'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex h-5 w-5 items-center justify-center"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1 truncate">{folder.name}</span>

          <div className="hidden items-center gap-0.5 group-hover:flex">
            {depth < 2 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openNewFolderDialog(folder.id, depth + 1);
                }}
                className="rounded p-1 hover:bg-background"
                title="Nouveau sous-dossier"
              >
                <Folder className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openNewDocDialog(folder.id);
              }}
              className="rounded p-1 hover:bg-background"
              title="Nouveau document"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openRenameDialog(folder);
              }}
              className="rounded p-1 hover:bg-background"
              title="Renommer"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteFolderDialog(folder);
              }}
              className="rounded p-1 hover:bg-background text-destructive"
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div>
            {folder.children.map((child) => renderFolder(child, depth + 1))}
            {docsInFolder.map((doc) => renderDocument(doc, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderDocument = (doc: DocumentSummary, depth: number = 0) => {
    const isActive = doc.id === currentDocId;

    return (
      <div
        key={doc.id}
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
          isActive ? 'bg-muted font-medium' : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Link href={`${basePath}/${doc.id}`} className="flex-1 truncate">
          {doc.title}
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDeleteDocDialog(doc);
          }}
          className="hidden rounded p-1 hover:bg-background text-destructive group-hover:block"
          title="Supprimer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const rootDocs = getDocumentsInFolder(null);

  return (
    <div className="space-y-1">
      {/* Actions racine */}
      <div className="flex items-center gap-1 px-2 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openNewFolderDialog(null, 0)}
          disabled={isPending}
        >
          <Folder className="mr-1 h-3 w-3" />
          Dossier
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openNewDocDialog(null)}
          disabled={isPending}
        >
          <Plus className="mr-1 h-3 w-3" />
          Document
        </Button>
      </div>

      {/* Arborescence */}
      <div className="space-y-0.5">
        {folders.map((folder) => renderFolder(folder))}
        {rootDocs.map((doc) => renderDocument(doc))}
      </div>

      {folders.length === 0 && rootDocs.length === 0 && (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
          Aucun document. Creez votre premier document.
        </p>
      )}

      {/* Dialog: Nouveau dossier */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nom du dossier"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFolder} disabled={isPending || !inputValue.trim()}>
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nouveau document */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau document</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Titre du document"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDocDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateDocument} disabled={isPending || !inputValue.trim()}>
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Renommer */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nouveau nom"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleRenameFolder} disabled={isPending || !inputValue.trim()}>
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Supprimer */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedFolder
              ? `Voulez-vous supprimer le dossier "${selectedFolder.name}" et tout son contenu ?`
              : selectedDoc
                ? `Voulez-vous supprimer le document "${selectedDoc.title}" ?`
                : ''}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="default"
              onClick={selectedFolder ? handleDeleteFolder : handleDeleteDocument}
              disabled={isPending}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
