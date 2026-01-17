'use client';

import { useState, useMemo, useCallback } from 'react';
import { WikiTopbar } from './wiki-topbar';
import { WikiSidebarTree } from './wiki-sidebar-tree';
import { WikiBreadcrumbs } from './wiki-breadcrumbs';
import { WikiHomeView } from './wiki-home-view';
import { WikiDocView } from './wiki-doc-view';
import { Badge } from '@/components/ui/badge';
import {
  WIKI_HOME,
  WIKI_SECTIONS,
  WIKI_DOCS,
  DEFAULT_OPEN_MAP,
  buildWikiIndex,
  type WikiIndexItem
} from './wiki-data';

export function WikiStructured() {
  const [activeId, setActiveId] = useState<string>('home');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(DEFAULT_OPEN_MAP);

  // Build flat index for search and breadcrumbs
  const index = useMemo(() => buildWikiIndex(WIKI_SECTIONS), []);

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
    WIKI_SECTIONS.forEach((s) => {
      allOpen[s.id] = true;
    });
    index.forEach((item) => {
      if (item.type === 'folder') {
        allOpen[item.id] = true;
      }
    });
    setOpenMap(allOpen);
  }, [index]);

  // Open a node (navigate to doc, or expand folder/section)
  const open = useCallback((id: string) => {
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

    // Navigate to doc
    setActiveId(id);
  }, [index]);

  // Handle actions (placeholder for now)
  const handleNewFolder = () => {
    alert('Action: créer un dossier (preview)');
  };

  const handleNewDocument = () => {
    alert('Action: créer un document (preview)');
  };

  const handleEdit = () => {
    alert('Action: éditer (preview)');
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
            sections={WIKI_SECTIONS}
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

          {/* Content */}
          {activeId === 'home' ? (
            <WikiHomeView home={WIKI_HOME} onOpen={open} />
          ) : (
            <WikiDocView
              doc={WIKI_DOCS[activeId] || null}
              docId={activeId}
              onOpen={open}
              onBackHome={() => open('home')}
              onEdit={handleEdit}
            />
          )}
        </main>
      </div>
    </div>
  );
}
