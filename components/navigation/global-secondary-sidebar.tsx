'use client';

import { useNav } from './nav-context';
import { WikiSidebar } from '@/components/wiki/wiki-sidebar';
import { SecondarySidebar } from './secondary-sidebar';
import type { FolderWithChildren, DocumentSummary } from '@/lib/actions/documents';

interface GlobalSecondarySidebarProps {
  wikiData: {
    folders: FolderWithChildren[];
    documents: DocumentSummary[];
  } | null;
}

export function GlobalSecondarySidebar({ wikiData }: GlobalSecondarySidebarProps) {
  const { activePrimaryItem, isSecondaryVisible, isCompactMode } = useNav();

  // Only show in compact mode when secondary is visible
  if (!isCompactMode || !isSecondaryVisible || !activePrimaryItem) {
    return null;
  }

  // Render appropriate sidebar based on active item
  let content = null;

  if (activePrimaryItem === 'wiki' && wikiData) {
    content = (
      <WikiSidebar
        folders={wikiData.folders}
        documents={wikiData.documents}
        basePath="/wiki"
      />
    );
  }

  // Future: add spaces sidebar
  // if (activePrimaryItem === 'spaces' && spacesData) {
  //   content = <SpacesSidebar data={spacesData} />;
  // }

  if (!content) return null;

  return <SecondarySidebar>{content}</SecondarySidebar>;
}
