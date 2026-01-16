'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createFolder,
  createDocument,
  renameFolder,
  deleteFolder,
  deleteDocument,
  moveFolder,
  moveDocument,
  type FolderWithChildren,
  type DocumentSummary
} from '@/lib/actions/documents';
import { canMoveFolder } from '@/lib/docs/tree-utils';

interface UseDocTreeProps {
  tenantId: string | null;
  folders: FolderWithChildren[];
  documents: DocumentSummary[];
  currentDocId?: string;
  basePath: string;
}

/**
 * Get all ancestor folder IDs for a given folder
 */
function getAncestorFolderIds(
  folderId: string | null,
  folders: FolderWithChildren[]
): string[] {
  if (!folderId) return [];

  const ancestors: string[] = [];

  const findPath = (
    folderList: FolderWithChildren[],
    targetId: string,
    path: string[]
  ): string[] | null => {
    for (const folder of folderList) {
      const currentPath = [...path, folder.id];
      if (folder.id === targetId) {
        return currentPath;
      }
      const found = findPath(folder.children, targetId, currentPath);
      if (found) return found;
    }
    return null;
  };

  const path = findPath(folders, folderId, []);
  if (path) {
    ancestors.push(...path);
  }

  return ancestors;
}

export function useDocTree({ tenantId, folders, documents, currentDocId, basePath }: UseDocTreeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Calculate initial expanded folders based on current document
  const initialExpanded = useMemo(() => {
    if (!currentDocId) return new Set<string>();

    const currentDoc = documents.find((d) => d.id === currentDocId);
    if (!currentDoc?.folderId) return new Set<string>();

    const ancestorIds = getAncestorFolderIds(currentDoc.folderId, folders);
    return new Set(ancestorIds);
  }, [currentDocId, documents, folders]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialExpanded);

  // Dialog states
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderWithChildren | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSummary | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Drag & drop state
  const [draggedItem, setDraggedItem] = useState<{ type: 'folder' | 'doc'; id: string } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isDropOnRoot, setIsDropOnRoot] = useState(false);

  // Folder toggle
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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'doc', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
    setIsDropOnRoot(false);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (folderId === null) {
      setIsDropOnRoot(true);
      setDropTargetId(null);
    } else {
      setIsDropOnRoot(false);
      setDropTargetId(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetId(null);
      setIsDropOnRoot(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;

    const { type, id } = draggedItem;

    // Validate folder moves
    if (type === 'folder') {
      if (!canMoveFolder(id, targetFolderId, folders)) {
        handleDragEnd();
        return;
      }
    }

    startTransition(async () => {
      try {
        if (type === 'folder') {
          await moveFolder(id, targetFolderId);
        } else {
          await moveDocument(id, targetFolderId);
        }
        router.refresh();
      } catch {
        // Silently fail - item stays in place
      }
    });

    handleDragEnd();
  };

  // CRUD handlers
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

  // Dialog openers
  const openNewFolderDialog = (parentId: string | null, depth: number) => {
    if (depth >= 1) return; // Max 2 levels of folders
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

  return {
    // State
    isPending,
    expandedFolders,
    draggedItem,
    dropTargetId,
    isDropOnRoot,

    // Dialog state
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

    // Handlers
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
  };
}
