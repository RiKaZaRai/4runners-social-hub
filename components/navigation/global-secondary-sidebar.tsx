'use client';

import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // Only show in compact mode when secondary is visible
  if (!isCompactMode || !isSecondaryVisible || !activePrimaryItem) {
    return null;
  }

  // Extract current document ID from URL if on a wiki document page
  const currentDocId = pathname.startsWith('/wiki/') ? pathname.split('/')[2] : undefined;

  // Render appropriate sidebar based on active item
  let content = null;

  if (activePrimaryItem === 'wiki' && wikiData) {
    content = (
      <WikiSidebar
        folders={wikiData.folders}
        documents={wikiData.documents}
        basePath="/wiki"
        currentDocId={currentDocId}
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
