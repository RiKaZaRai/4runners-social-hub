'use client';

import Link from 'next/link';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  GripVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FolderWithChildren, DocumentSummary } from '@/lib/actions/documents';
import { useDocTree } from './hooks/useDocTree';
import { NewFolderDialog, RenameFolderDialog, DeleteDialog } from './dialogs/folder-dialogs';
import { NewDocumentDialog } from './dialogs/document-dialogs';

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
  const {
    isPending,
    expandedFolders,
    draggedItem,
    dropTargetId,
    isDropOnRoot,
    showNewFolderDialog,
    setShowNewFolderDialog,
    showNewDocDialog,
    setShowNewDocDialog,
    showRenameDialog,
    setShowRenameDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    selectedFolder,
    selectedDoc,
    inputValue,
    setInputValue,
    toggleFolder,
    getDocumentsInFolder,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCreateFolder,
    handleCreateDocument,
    handleRenameFolder,
    handleDeleteFolder,
    handleDeleteDocument,
    openNewFolderDialog,
    openNewDocDialog,
    openRenameDialog,
    openDeleteFolderDialog,
    openDeleteDocDialog
  } = useDocTree({ tenantId, folders, documents, currentDocId, basePath });

  const renderFolder = (folder: FolderWithChildren, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const docsInFolder = getDocumentsInFolder(folder.id);
    const hasChildren = folder.children.length > 0 || docsInFolder.length > 0;
    const isDropTarget = dropTargetId === folder.id;
    const isDragging = draggedItem?.type === 'folder' && draggedItem.id === folder.id;

    return (
      <div key={folder.id} className={cn(isDragging && 'opacity-50')}>
        <div
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          className={cn(
            'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted',
            isDropTarget && 'bg-primary/10 ring-2 ring-primary/50'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
            onDragEnd={handleDragEnd}
            className="flex h-5 w-5 cursor-grab items-center justify-center text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            title="Glisser pour deplacer"
          >
            <GripVertical className="h-4 w-4" />
          </div>
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
    const isDragging = draggedItem?.type === 'doc' && draggedItem.id === doc.id;

    return (
      <div
        key={doc.id}
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
          isActive ? 'bg-muted font-medium' : 'hover:bg-muted',
          isDragging && 'opacity-50'
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
      >
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'doc', doc.id)}
          onDragEnd={handleDragEnd}
          className="flex h-5 w-5 cursor-grab items-center justify-center text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          title="Glisser pour deplacer"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Link href={`${basePath}/${doc.id}/edit`} className="flex-1 truncate">
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
      <div
        className={cn(
          'space-y-0.5 rounded-md p-1 transition-colors',
          isDropOnRoot && draggedItem && 'bg-primary/10 ring-2 ring-primary/50'
        )}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        {folders.map((folder) => renderFolder(folder))}
        {rootDocs.map((doc) => renderDocument(doc))}
      </div>

      {folders.length === 0 && rootDocs.length === 0 && (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
          Aucun document. Creez votre premier document.
        </p>
      )}

      {/* Dialogs */}
      <NewFolderDialog
        open={showNewFolderDialog}
        onOpenChange={setShowNewFolderDialog}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleCreateFolder}
        isPending={isPending}
      />

      <NewDocumentDialog
        open={showNewDocDialog}
        onOpenChange={setShowNewDocDialog}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleCreateDocument}
        isPending={isPending}
      />

      <RenameFolderDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleRenameFolder}
        isPending={isPending}
      />

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        folder={selectedFolder}
        document={selectedDoc}
        onDeleteFolder={handleDeleteFolder}
        onDeleteDocument={handleDeleteDocument}
        isPending={isPending}
      />
    </div>
  );
}
