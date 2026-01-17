'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WikiTopbar } from './wiki-topbar';
import { WikiSidebarTree } from './wiki-sidebar-tree';
import { WikiBreadcrumbs } from './wiki-breadcrumbs';
import { WikiHomeView } from './wiki-home-view';
import { Badge } from '@/components/ui/badge';
import { NewFolderDialog } from '@/components/docs/dialogs/folder-dialogs';
import { NewDocumentDialog } from '@/components/docs/dialogs/document-dialogs';
import { createFolder, createDocument } from '@/lib/actions/documents';
import type { FolderWithChildren, DocumentSummary } from '@/lib/actions/documents';

interface WikiStructuredProps {
  folders: FolderWithChildren[];
  documents: DocumentSummary[];
  basePath: string;
  tenantId?: string | null;
}

export interface WikiTreeNode {
  id: string;
  type: 'folder' | 'doc';
  title: string;
  nodes?: WikiTreeNode[];
  updatedAt?: string;
}

export interface WikiSection {
  id: string;
  title: string;
  nodes: WikiTreeNode[];
}

export interface WikiIndexItem {
  id: string;
  type: 'folder' | 'doc' | 'section';
  title: string;
  parents: { id: string; title: string; type: string }[];
}

// Convert folders and documents to tree structure
function buildSections(
  folders: FolderWithChildren[],
  documents: DocumentSummary[]
): WikiSection[] {
  const getDocsInFolder = (folderId: string | null) =>
    documents.filter((d) => d.folderId === folderId);

  const buildFolderNode = (folder: FolderWithChildren): WikiTreeNode => {
    const childFolders = folder.children.map(buildFolderNode);
    const childDocs = getDocsInFolder(folder.id).map((doc) => ({
      id: doc.id,
      type: 'doc' as const,
      title: doc.title,
      updatedAt: doc.updatedAt
    }));

    return {
      id: folder.id,
      type: 'folder',
      title: folder.name,
      nodes: [...childFolders, ...childDocs]
    };
  };

  // Root level documents (no folder)
  const rootDocs = getDocsInFolder(null).map((doc) => ({
    id: doc.id,
    type: 'doc' as const,
    title: doc.title,
    updatedAt: doc.updatedAt
  }));

  // Root level folders
  const rootFolders = folders.map(buildFolderNode);

  // If we have folders, create a section structure
  // Otherwise just show documents directly
  if (folders.length > 0 || rootDocs.length > 0) {
    return [
      {
        id: 'root',
        title: 'Documents',
        nodes: [...rootFolders, ...rootDocs]
      }
    ];
  }

  return [];
}

// Build flat index for search
function buildWikiIndex(sections: WikiSection[]): WikiIndexItem[] {
  const flat: WikiIndexItem[] = [];

  const walk = (
    nodes: WikiTreeNode[],
    parents: { id: string; title: string; type: string }[] = []
  ) => {
    nodes.forEach((n) => {
      flat.push({ id: n.id, type: n.type, title: n.title, parents });
      if (n.nodes) {
        walk(n.nodes, [...parents, { id: n.id, title: n.title, type: n.type }]);
      }
    });
  };

  sections.forEach((s) => {
    walk(s.nodes, [{ id: s.id, title: s.title, type: 'section' }]);
  });

  return flat;
}

export function WikiStructured({ folders, documents, basePath, tenantId = null }: WikiStructuredProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string>('home');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({ root: true });

  // Dialog states
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Build sections from folders and documents
  const sections = useMemo(() => buildSections(folders, documents), [folders, documents]);

  // Build flat index for search and breadcrumbs
  const index = useMemo(() => buildWikiIndex(sections), [sections]);

  // Compute breadcrumb trail
  const trail = useMemo(() => {
    if (activeId === 'home') {
      return [{ id: 'home', title: 'Wiki' }];
    }

    const hit = index.find((i) => i.id === activeId);
    if (!hit) {
      return [{ id: 'home', title: 'Wiki' }];
    }

    return [
      { id: 'home', title: 'Wiki' },
      ...hit.parents.map((p) => ({ id: p.id, title: p.title })),
      { id: hit.id, title: hit.title }
    ];
  }, [activeId, index]);

  // Toggle folder open/close
  const toggleOpen = useCallback((id: string) => {
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  }, []);

  // Expand all folders
  const expandAll = useCallback(() => {
    const allOpen: Record<string, boolean> = {};
    sections.forEach((s) => {
      allOpen[s.id] = true;
    });
    index.forEach((item) => {
      if (item.type === 'folder') {
        allOpen[item.id] = true;
      }
    });
    setOpenMap(allOpen);
  }, [sections, index]);

  // Open a node (navigate to doc, or expand folder/section)
  const open = useCallback(
    (id: string) => {
      if (id === 'home') {
        setActiveId('home');
        return;
      }

      const node = index.find((i) => i.id === id);
      if (node?.type === 'folder' || node?.type === 'section') {
        // Just expand the folder, don't navigate
        setOpenMap((m) => ({ ...m, [id]: true }));
        return;
      }

      // Navigate to doc edit page
      router.push(`${basePath}/${id}/edit`);
    },
    [index, router, basePath]
  );

  // Recent documents (last 5 updated)
  const recentDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [documents]);

  // Handle new folder
  const handleNewFolder = () => {
    setInputValue('');
    setShowNewFolderDialog(true);
  };

  const handleCreateFolder = () => {
    if (!inputValue.trim()) return;

    startTransition(async () => {
      try {
        await createFolder(tenantId, null, inputValue.trim());
        setShowNewFolderDialog(false);
        setInputValue('');
        router.refresh();
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    });
  };

  // Handle new document
  const handleNewDocument = () => {
    setInputValue('');
    setShowNewDocDialog(true);
  };

  const handleCreateDocument = () => {
    if (!inputValue.trim()) return;

    startTransition(async () => {
      try {
        const doc = await createDocument(tenantId, null, inputValue.trim());
        setShowNewDocDialog(false);
        setInputValue('');
        // Navigate to the new document
        router.push(`${basePath}/${doc.id}/edit`);
      } catch (error) {
        console.error('Failed to create document:', error);
      }
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Topbar */}
      <WikiTopbar
        index={index}
        onOpen={open}
        onNewFolder={handleNewFolder}
        onNewDocument={handleNewDocument}
      />

      {/* Main layout */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Sidebar */}
        <aside className="w-80 shrink-0">
          <WikiSidebarTree
            sections={sections}
            activeId={activeId}
            openMap={openMap}
            onToggleOpen={toggleOpen}
            onExpandAll={expandAll}
            onSelect={open}
          />
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-auto rounded-lg border bg-card p-4">
          {/* Breadcrumbs + view indicator */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <WikiBreadcrumbs trail={trail} onSelect={open} />
            <Badge variant="outline">
              Vue : <span className="ml-1 font-semibold">Wiki structuré</span>
            </Badge>
          </div>

          {/* Home view with recent docs */}
          <WikiHomeView
            documents={documents}
            recentDocs={recentDocs}
            onOpen={open}
          />
        </main>
      </div>

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
    </div>
  );
}
