import type { FolderWithChildren } from '@/lib/actions/documents';

/**
 * Get the depth of a folder in the tree (0-indexed)
 * Returns 0 for root level, 1 for first-level folders, 2 for subfolders, etc.
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
 * Get the maximum depth of descendants for a folder
 * Returns 0 if folder has no children, 1 if it has direct children only, etc.
 */
export function getMaxDescendantDepth(
  folderId: string,
  allFolders: FolderWithChildren[]
): number {
  const findFolder = (folders: FolderWithChildren[]): FolderWithChildren | null => {
    for (const folder of folders) {
      if (folder.id === folderId) return folder;
      const found = findFolder(folder.children);
      if (found) return found;
    }
    return null;
  };

  const folder = findFolder(allFolders);
  if (!folder) return 0;

  const getMaxDepth = (f: FolderWithChildren): number => {
    if (f.children.length === 0) return 0;
    return 1 + Math.max(...f.children.map(getMaxDepth));
  };

  return getMaxDepth(folder);
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
 *
 * maxDepth = 3 means: root (0) -> level 1 -> level 2 -> level 3 (max)
 * So we allow folders at depths 1, 2, 3 (3 levels total)
 */
export function canMoveFolder(
  folderId: string,
  targetFolderId: string | null,
  allFolders: FolderWithChildren[],
  maxDepth: number = 3
): boolean {
  // Can't drop into itself
  if (folderId === targetFolderId) return false;

  // Can't drop into a descendant
  if (targetFolderId && isDescendantOf(targetFolderId, folderId, allFolders)) return false;

  // Calculate the final depth after moving
  // Target depth: 0 = root, 1 = first level folder, etc.
  const targetDepth = getFolderDepth(targetFolderId, allFolders);

  // The moved folder will be at targetDepth + 1
  const movedFolderFinalDepth = targetDepth + 1;

  // Get the max depth of descendants in the moved folder
  const descendantDepth = getMaxDescendantDepth(folderId, allFolders);

  // Final max depth = moved folder depth + descendant depth
  const finalMaxDepth = movedFolderFinalDepth + descendantDepth;

  // Check if this exceeds the limit
  if (finalMaxDepth > maxDepth) return false;

  return true;
}
