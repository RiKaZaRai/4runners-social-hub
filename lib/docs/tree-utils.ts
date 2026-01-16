import type { FolderWithChildren } from '@/lib/actions/documents';

/**
 * Get the depth of a folder in the tree (1-indexed)
 * Returns 0 for null (root level), 1 for root folders, 2 for subfolders, etc.
 */
export function getFolderDepth(
  folderId: string | null,
  allFolders: FolderWithChildren[]
): number {
  if (!folderId) return 0;

  const findDepth = (
    folders: FolderWithChildren[],
    targetId: string,
    currentDepth: number
  ): number => {
    for (const folder of folders) {
      if (folder.id === targetId) return currentDepth;
      const found = findDepth(folder.children, targetId, currentDepth + 1);
      if (found !== -1) return found;
    }
    return -1;
  };

  return findDepth(allFolders, folderId, 1);
}

/**
 * Check if a folder is a descendant of another folder
 */
export function isDescendantOf(
  folderId: string,
  ancestorId: string,
  allFolders: FolderWithChildren[]
): boolean {
  const findFolder = (
    folders: FolderWithChildren[]
  ): FolderWithChildren | null => {
    for (const folder of folders) {
      if (folder.id === ancestorId) return folder;
      const found = findFolder(folder.children);
      if (found) return found;
    }
    return null;
  };

  const ancestor = findFolder(allFolders);
  if (!ancestor) return false;

  const checkDescendants = (folder: FolderWithChildren): boolean => {
    if (folder.id === folderId) return true;
    return folder.children.some(checkDescendants);
  };

  return checkDescendants(ancestor);
}

/**
 * Check if a folder move is valid (not into itself, descendants, or exceeding depth)
 */
export function canMoveFolder(
  folderId: string,
  targetFolderId: string | null,
  allFolders: FolderWithChildren[],
  maxDepth: number = 3
): boolean {
  if (!targetFolderId) return true; // Can always move to root

  // Can't drop into itself
  if (folderId === targetFolderId) return false;

  // Can't drop into a descendant
  if (isDescendantOf(targetFolderId, folderId, allFolders)) return false;

  // Check depth limit
  const targetDepth = getFolderDepth(targetFolderId, allFolders);
  if (targetDepth >= maxDepth) return false;

  return true;
}
