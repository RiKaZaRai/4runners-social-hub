'use client';

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  FolderPlus,
  FileText,
  Star,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  Library,
  CornerDownLeft,
  Folder,
  Map,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewFolderDialog } from '@/components/docs/dialogs/folder-dialogs';
import { NewDocumentDialog } from '@/components/docs/dialogs/document-dialogs';
import { cn } from '@/lib/utils';
import { wikiSections } from '@/lib/wiki-sections';
import { DocContentView } from '@/components/docs/doc-content-view';
import { useNav } from '@/components/navigation';
import { ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import type { FolderWithChildren, DocumentFull } from '@/lib/actions/documents';
import type { JSONContent } from '@tiptap/react';

interface WikiStructuredProps {
  folders: FolderWithChildren[];
  documents: DocumentFull[];
  basePath: string;
  tenantId?: string | null;
  initialDocId?: string;
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
  updatedAt?: string;
}

// Build flat index for search
function buildWikiIndex(
  folders: FolderWithChildren[],
  documents: DocumentFull[]
): WikiIndexItem[] {
  const flat: WikiIndexItem[] = [];

  const walkFolders = (
    folderList: FolderWithChildren[],
    parents: { id: string; title: string; type: string }[] = []
  ) => {
    folderList.forEach((folder) => {
      flat.push({
        id: folder.id,
        type: 'folder',
        title: folder.name,
        parents,
      });
      if (folder.children.length > 0) {
        walkFolders(folder.children, [
          ...parents,
          { id: folder.id, title: folder.name, type: 'folder' },
        ]);
      }
    });
  };

  walkFolders(folders);

  documents.forEach((doc) => {
    const docParents: { id: string; title: string; type: string }[] = [];
    if (doc.folderId) {
      // Find folder path
      const findFolderPath = (
        folderList: FolderWithChildren[],
        targetId: string,
        path: { id: string; title: string; type: string }[] = []
      ): { id: string; title: string; type: string }[] | null => {
        for (const folder of folderList) {
          if (folder.id === targetId) {
            return [...path, { id: folder.id, title: folder.name, type: 'folder' }];
          }
          if (folder.children.length > 0) {
            const found = findFolderPath(folder.children, targetId, [
              ...path,
              { id: folder.id, title: folder.name, type: 'folder' },
            ]);
            if (found) return found;
          }
        }
        return null;
      };
      const path = findFolderPath(folders, doc.folderId);
      if (path) {
        docParents.push(...path);
      }
    }
    flat.push({
      id: doc.id,
      type: 'doc',
      title: doc.title,
      parents: docParents,
      updatedAt: doc.updatedAt,
    });
  });

  return flat;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "aujourd'hui";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} j`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Estimate reading time (mock - 4-6 min)
function estimateReadingTime(): number {
  return Math.floor(Math.random() * 3) + 4;
}

// Helper to find a folder by ID recursively in a tree
function findFolderById(list: FolderWithChildren[], id: string): FolderWithChildren | null {
  for (const f of list) {
    if (f.id === id) return f;
    const child = findFolderById(f.children, id);
    if (child) return child;
  }
  return null;
}

// Helper to check if a folder belongs to a section
function folderBelongsToSection(folder: FolderWithChildren, sectionId: string, sectionLabel: string): boolean {
  return (
    folder.name.toUpperCase().startsWith(`[${sectionId.toUpperCase()}]`) ||
    folder.name.toUpperCase().includes(sectionLabel.toUpperCase())
  );
}

// Helper to get section for a folder
function getFolderSection(folder: FolderWithChildren): { id: string; label: string } | null {
  for (const section of wikiSections) {
    if (folderBelongsToSection(folder, section.id, section.label)) {
      return { id: section.id, label: section.label };
    }
  }
  return null;
}

export function WikiStructured({
  folders,
  documents: propDocuments,
  basePath,
  tenantId = null,
  initialDocId,
}: WikiStructuredProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCompactMode, isSecondaryVisible, isSecondaryPinned, activePrimaryItem, toggleSecondaryPinned, hideSecondary } = useNav();
  const [isPending, startTransition] = useTransition();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Local state for documents - updated after saves and synced from props
  const [localDocuments, setLocalDocuments] = useState<DocumentFull[]>(propDocuments);

  // Sync local documents with props when they change (e.g., after router.refresh())
  useEffect(() => {
    setLocalDocuments(propDocuments);
  }, [propDocuments]);

  // Use local documents for rendering
  const documents = localDocuments;

  // Dialog states
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [folderSection, setFolderSection] = useState<string>('');
  // Document dialog states
  const [docSection, setDocSection] = useState<string>('');
  const [docFolderId, setDocFolderId] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Table filter state (for documents table section filter)
  const [tableFilter, setTableFilter] = useState<string>('all');

  // Reset view when navigating to overview (via ?reset param)
  useEffect(() => {
    const reset = searchParams.get('reset');
    if (reset) {
      setSelectedSection(null);
      setSelectedFolderId(null);
      setSelectedDocId(null);
      setTableFilter('all');
      // Clean the URL
      router.replace(basePath);
    }
  }, [searchParams, basePath, router]);

  // Set initial document if provided
  useEffect(() => {
    if (initialDocId && documents.find((d) => d.id === initialDocId)) {
      setSelectedDocId(initialDocId);
      // Expand the folder and section containing this document
      const doc = documents.find((d) => d.id === initialDocId);
      if (doc?.folderId) {
        setExpandedFolders((prev) => ({ ...prev, [doc.folderId!]: true }));
        const folder = findFolderById(folders, doc.folderId);
        if (folder) {
          const section = getFolderSection(folder);
          if (section) {
            setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
          }
        }
      }
    }
  }, [initialDocId, documents, folders]);

  // Build flat index for search
  const index = useMemo(() => buildWikiIndex(folders, documents), [folders, documents]);

  // Get current selected folder object (recursive search for nested folders)
  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return findFolderById(folders, selectedFolderId);
  }, [selectedFolderId, folders]);

  // Get current section object
  const currentSectionObj = useMemo(() => {
    if (selectedSection) {
      return wikiSections.find((s) => s.id === selectedSection) || null;
    }
    return null;
  }, [selectedSection]);

  // Get selected document
  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return documents.find((d) => d.id === selectedDocId) || null;
  }, [selectedDocId, documents]);

  // Get document context (section label and folder name)
  const docContext = useMemo(() => {
    if (!selectedDoc) return { sectionLabel: '', folderName: '' };

    const folder = selectedDoc.folderId ? findFolderById(folders, selectedDoc.folderId) : null;
    if (!folder) return { sectionLabel: 'Wiki', folderName: 'Racine' };

    // Extract section from folder name
    const sectionMatch = folder.name.match(/^\[([^\]]+)\]/);
    const sectionId = sectionMatch ? sectionMatch[1].toLowerCase() : '';
    const section = wikiSections.find((s) => s.id === sectionId);
    const sectionLabel = section?.label || sectionId.replace(/-/g, ' ');
    const folderName = folder.name.replace(/^\[.*?\]\s*/, '');

    return { sectionLabel, folderName };
  }, [selectedDoc, folders]);

  // Filter folders and documents based on current context
  const contextFolders = useMemo(() => {
    if (selectedFolderId) {
      // If a folder is selected, show its children (subfolders)
      const folder = findFolderById(folders, selectedFolderId);
      return folder?.children || [];
    }
    if (selectedSection && currentSectionObj) {
      // If a section is selected, show folders belonging to that section
      return folders.filter((f) => folderBelongsToSection(f, currentSectionObj.id, currentSectionObj.label));
    }
    // No selection = all folders
    return folders;
  }, [selectedFolderId, selectedSection, currentSectionObj, folders]);

  const contextDocuments = useMemo(() => {
    if (selectedFolderId) {
      // If a folder is selected, show documents in that folder
      return documents.filter((d) => d.folderId === selectedFolderId);
    }
    if (selectedSection && currentSectionObj) {
      // If a section is selected, show documents in folders of that section
      const sectionFolderIds = folders
        .filter((f) => folderBelongsToSection(f, currentSectionObj.id, currentSectionObj.label))
        .map((f) => f.id);
      return documents.filter((d) => d.folderId && sectionFolderIds.includes(d.folderId));
    }
    // No selection = all documents
    return documents;
  }, [selectedFolderId, selectedSection, currentSectionObj, folders, documents]);

  // Recent documents (last 3 updated) - filtered by context
  const recentDocs = useMemo(() => {
    return [...contextDocuments]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [contextDocuments]);

  // Popular documents (just pick first 3 for now) - filtered by context
  const popularDocs = useMemo(() => {
    return contextDocuments.slice(0, 3);
  }, [contextDocuments]);

  // Helper to get section ID for a document
  const getDocSection = useCallback((doc: DocumentFull): string | null => {
    if (!doc.folderId) return null;
    const folder = findFolderById(folders, doc.folderId);
    if (!folder) return null;
    const section = getFolderSection(folder);
    return section?.id || null;
  }, [folders]);

  // All docs for table - filtered by context and table filter
  const allDocs = useMemo(() => {
    let docs = [...contextDocuments];

    // Apply section filter if not 'all' and we're in overview mode (no section/folder selected)
    if (tableFilter !== 'all' && !selectedSection && !selectedFolderId) {
      docs = docs.filter((doc) => getDocSection(doc) === tableFilter);
    }

    return docs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [contextDocuments, tableFilter, selectedSection, selectedFolderId, getDocSection]);

  // Last update date in current context
  const lastUpdateDate = useMemo(() => {
    if (contextDocuments.length === 0) return null;
    const sorted = [...contextDocuments].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted[0]?.updatedAt || null;
  }, [contextDocuments]);

  // Search results
  const searchResults = query.trim()
    ? index
        .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : [];

  const handleSelect = useCallback(
    (id: string) => {
      const item = index.find((i) => i.id === id);
      if (item?.type === 'doc') {
        // Find the document and its folder to set context
        const doc = documents.find((d) => d.id === id);
        if (doc?.folderId) {
          const folder = findFolderById(folders, doc.folderId);
          if (folder) {
            const section = getFolderSection(folder);
            if (section) {
              setSelectedSection(section.id);
              setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
            }
            setSelectedFolderId(doc.folderId);
            setExpandedFolders((prev) => ({ ...prev, [doc.folderId!]: true }));
          }
        }
        setSelectedDocId(id);
      }
      setQuery('');
      setIsSearchOpen(false);
    },
    [index, documents, folders]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsSearchOpen(false);
        break;
    }
  };

  // Toggle section expand/collapse
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Handle section click
  const handleSectionClick = (sectionId: string) => {
    toggleSection(sectionId);
    setSelectedSection(sectionId);
    setSelectedFolderId(null);
    setSelectedDocId(null);
  };

  // Toggle folder expand/collapse
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Handle folder click
  const handleFolderClick = (folderId: string, sectionId: string) => {
    toggleFolder(folderId);
    setSelectedFolderId(folderId);
    setSelectedSection(sectionId);
    setSelectedDocId(null);
  };

  // Navigate back to overview
  const handleBackToOverview = () => {
    setSelectedSection(null);
    setSelectedFolderId(null);
    setSelectedDocId(null);
  };

  // Navigate back to section
  const handleBackToSection = () => {
    setSelectedFolderId(null);
    setSelectedDocId(null);
  };

  // Navigate back to folder (from document view)
  const handleBackToFolder = () => {
    setSelectedDocId(null);
  };

  // Handle save document (inline edit) - use fetch API to avoid server action issues
  const handleSaveDocument = async (newTitle: string, newContent: JSONContent) => {
    if (!selectedDocId) {
      return { ok: false, skipped: true, updatedAt: new Date().toISOString() };
    }

    const response = await fetch(`/api/documents/${selectedDocId}/autosave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });

    if (!response.ok) {
      let message = 'Erreur de sauvegarde';
      try {
        const data = await response.json();
        if (typeof data?.error === 'string') message = data.error;
      } catch {
        // Keep default message
      }
      throw new Error(message);
    }

    const data = (await response.json()) as {
      ok: boolean;
      skipped: boolean;
      updatedAt: string;
    };

    // Update local state instead of router.refresh() - more efficient, no race conditions
    if (!data.skipped) {
      setLocalDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocId
            ? { ...doc, title: newTitle, content: newContent, updatedAt: data.updatedAt }
            : doc
        )
      );
    }

    return data;
  };

  // Handle delete document
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      // Remove from local state
      setLocalDocuments((prev) => prev.filter((doc) => doc.id !== docId));

      // If we were viewing this document, go back to folder view
      if (selectedDocId === docId) {
        setSelectedDocId(null);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Erreur lors de la suppression du document');
    }
  };

  // Handle new folder
  const handleNewFolder = () => {
    setInputValue('');
    setFolderSection('');
    setShowNewFolderDialog(true);
  };

  const handleCreateFolder = () => {
    if (!inputValue.trim() || !folderSection) return;

    startTransition(async () => {
      try {
        // Create folder with section as a tag/prefix in the name
        const folderName = `[${folderSection.toUpperCase()}] ${inputValue.trim()}`;

        const response = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, parentId: null, name: folderName })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create folder');
        }

        setShowNewFolderDialog(false);
        setInputValue('');
        setFolderSection('');
        router.refresh();
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    });
  };

  // Handle new document
  const handleNewDocument = () => {
    setInputValue('');
    setDocSection('');
    setDocFolderId(null);
    setShowNewDocDialog(true);
  };

  const handleCreateDocument = () => {
    if (!inputValue.trim() || !docSection) return;

    startTransition(async () => {
      try {
        // Create document in the selected folder (or null for section root)
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, folderId: docFolderId, title: inputValue.trim() })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create document');
        }

        const { document: doc } = await response.json();

        setShowNewDocDialog(false);
        setInputValue('');
        setDocSection('');
        setDocFolderId(null);

        // Add new document to local state
        setLocalDocuments((prev) => [
          ...prev,
          {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            folderId: doc.folderId,
            isPublic: doc.isPublic,
            publicToken: doc.publicToken,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            createdBy: doc.createdBy
          }
        ]);

        // Select the new document inline (no navigation)
        if (docFolderId) {
          const folder = findFolderById(folders, docFolderId);
          if (folder) {
            const section = getFolderSection(folder);
            if (section) {
              setSelectedSection(section.id);
              setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
            }
            setSelectedFolderId(docFolderId);
            setExpandedFolders((prev) => ({ ...prev, [docFolderId]: true }));
          }
        }
        setSelectedDocId(doc.id);
      } catch (error) {
        console.error('Failed to create document:', error);
      }
    });
  };

  // In compact mode, sidebar is handled globally - don't render it here
  // In comfort mode, sidebar is part of the page layout
  const showSidebar = !isCompactMode;

  // Grid classes based on mode
  // In compact mode, sidebar is global/fixed, so grid is always 1 column
  // In comfort mode, sidebar is sticky and part of the grid
  const gridClasses = cn(
    'grid h-full',
    isCompactMode ? 'grid-cols-1' : 'grid-cols-[280px_1fr]'
  );

  return (
    <div className="min-h-full text-foreground">
      {/* Gradient background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(900px_520px_at_18%_8%,rgba(59,130,246,0.10),transparent_62%),radial-gradient(780px_460px_at_82%_16%,rgba(139,92,246,0.08),transparent_62%)] bg-background" />

      <div className={gridClasses}>
        {/* SIDEBAR - Only in comfort mode (compact mode uses global sidebar) */}
        {showSidebar && (
        <aside className="sticky top-0 h-screen border-r border-border/50 bg-secondary/60 backdrop-blur-sm">
          <div className="p-4">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-background/40">
                  <Sparkles className="h-4 w-4 opacity-80" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs tracking-widest text-muted-foreground">WIKI</div>
                  <div className="truncate text-base font-extrabold">Base documentaire</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-2">
                {wikiSections.map((section) => {
                  const Icon = section.icon;
                  const isExpanded = expandedSections[section.id];
                  const isSectionSelected = selectedSection === section.id && !selectedFolderId;
                  // Filter folders that belong to this section
                  const sectionFolders = folders.filter((f) =>
                    folderBelongsToSection(f, section.id, section.label)
                  );

                  return (
                    <div key={section.id}>
                      <button
                        onClick={() => handleSectionClick(section.id)}
                        className={cn(
                          'group flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                          isSectionSelected
                            ? 'border-primary/30 bg-primary/10'
                            : selectedSection === section.id
                              ? 'border-border/60 bg-background/30'
                              : 'border-border/60 bg-background/20 hover:bg-background/35'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            isSectionSelected || selectedSection === section.id
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'flex-1 font-semibold',
                            isSectionSelected || selectedSection === section.id ? 'text-foreground' : 'text-foreground/90'
                          )}
                        >
                          {section.label}
                        </span>
                        {isSectionSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                      {isExpanded && (
                        <div className="ml-4 mt-2 space-y-1 border-l border-border/50 pl-3">
                          {sectionFolders.map((folder) => {
                            const isFolderSelected = selectedFolderId === folder.id;
                            const isFolderExpanded = expandedFolders[folder.id];
                            const folderDocs = documents.filter((d) => d.folderId === folder.id);
                            return (
                              <div key={folder.id}>
                                <button
                                  onClick={() => handleFolderClick(folder.id, section.id)}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                                    isFolderSelected
                                      ? 'bg-primary/10 text-primary'
                                      : 'text-muted-foreground hover:bg-background/35 hover:text-foreground'
                                  )}
                                >
                                  <Folder className="h-3.5 w-3.5" />
                                  <span className="truncate">{folder.name.replace(/^\[.*?\]\s*/, '')}</span>
                                  {isFolderSelected && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                                </button>
                                {isFolderExpanded && folderDocs.length > 0 && (
                                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border/40 pl-2">
                                    {folderDocs.map((doc) => {
                                      const isDocSelected = selectedDocId === doc.id;
                                      return (
                                        <button
                                          key={doc.id}
                                          onClick={() => handleSelect(doc.id)}
                                          className={cn(
                                            'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition',
                                            isDocSelected
                                              ? 'bg-primary/10 text-primary font-medium'
                                              : 'text-muted-foreground hover:bg-background/35 hover:text-foreground'
                                          )}
                                        >
                                          <FileText className="h-3 w-3" />
                                          <span className="truncate">{doc.title}</span>
                                          {isDocSelected && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {sectionFolders.length === 0 && (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                              Aucun dossier
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
        )}

        {/* MAIN */}
        <main className="min-w-0">
          {/* TOPBAR */}
          <header className="sticky top-0 z-10 border-b border-border/50 bg-background/65 backdrop-blur-md">
            <div className="flex items-center gap-3 p-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-card/60">
                  <BookOpen className="h-4 w-4 opacity-85" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold">Centre de connaissance</div>
                  <div className="text-xs text-muted-foreground">
                    Recherche, templates, process - tout au meme endroit
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="ml-3 flex flex-1 items-center gap-2">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsSearchOpen(true);
                      setSelectedIndex(0);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Rechercher dans le wiki..."
                    className="h-11 rounded-xl border border-border/70 bg-card/80 pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                  />

                  {/* Search results dropdown */}
                  {isSearchOpen && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-lg">
                      {searchResults.map((result, idx) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result.id)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                            idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                          )}
                        >
                          {result.type === 'doc' ? (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Folder className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            {result.parents.length > 0 && (
                              <div className="text-xs text-muted-foreground truncate">
                                {result.parents.map((p) => p.title).join(' / ')}
                              </div>
                            )}
                          </div>
                          <CornerDownLeft className="h-3 w-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="secondary" className="h-11 rounded-xl" onClick={handleNewFolder}>
                  <FolderPlus className="mr-2 h-4 w-4" /> Nouveau dossier
                </Button>

                <Button className="h-11 rounded-xl" onClick={handleNewDocument}>
                  <FileText className="mr-2 h-4 w-4" /> Nouveau doc
                </Button>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  onClick={handleBackToOverview}
                  className={cn(
                    'font-semibold transition hover:text-foreground',
                    !selectedSection && !selectedDocId ? 'text-foreground' : 'text-foreground/85'
                  )}
                >
                  Wiki
                </button>
                {currentSectionObj && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <button
                      onClick={handleBackToSection}
                      className={cn(
                        'transition hover:text-foreground',
                        !selectedFolderId && !selectedDocId ? 'font-semibold text-foreground' : ''
                      )}
                    >
                      {currentSectionObj.label}
                    </button>
                  </>
                )}
                {selectedFolder && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <button
                      onClick={handleBackToFolder}
                      className={cn(
                        'transition hover:text-foreground',
                        !selectedDocId ? 'font-semibold text-foreground' : ''
                      )}
                    >
                      {selectedFolder.name.replace(/^\[.*?\]\s*/, '')}
                    </button>
                  </>
                )}
                {selectedDoc && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">
                      {selectedDoc.title}
                    </span>
                  </>
                )}
                {!selectedSection && !selectedFolderId && !selectedDocId && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Vue d&apos;ensemble</span>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="p-5">
            {selectedDoc ? (
              /* Document view - key forces remount when switching documents */
              <DocContentView
                key={selectedDoc.id}
                docId={selectedDoc.id}
                title={selectedDoc.title}
                content={selectedDoc.content as JSONContent}
                updatedAt={selectedDoc.updatedAt}
                createdBy={selectedDoc.createdBy}
                sectionLabel={docContext.sectionLabel}
                folderName={docContext.folderName}
                onSave={handleSaveDocument}
                onDelete={() => handleDeleteDocument(selectedDoc.id)}
              />
            ) : (
            <div className="grid gap-5">
              {/* KPI badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {contextDocuments.length} doc{contextDocuments.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {contextFolders.length} dossier{contextFolders.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  Derniere maj: {lastUpdateDate ? formatRelativeTime(lastUpdateDate) : 'N/A'}
                </Badge>
              </div>

              {/* Cards row */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Popular */}
                <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                      <Star className="h-4 w-4 text-primary" /> Populaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {popularDocs.length > 0 ? (
                      popularDocs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleSelect(doc.id)}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/20 p-3 text-left transition hover:bg-background/35"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{doc.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="rounded-full">
                                Doc
                              </Badge>
                              <span>Maj {formatRelativeTime(doc.updatedAt)}</span>
                              <span>-</span>
                              <span>{estimateReadingTime()} min</span>
                            </div>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Aucun document
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent */}
                <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                      <Clock className="h-4 w-4 text-primary" /> Recents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {recentDocs.length > 0 ? (
                      recentDocs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleSelect(doc.id)}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/20 p-3 text-left transition hover:bg-background/35"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{doc.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="rounded-full">
                                Doc
                              </Badge>
                              <span>Maj {formatRelativeTime(doc.updatedAt)}</span>
                              <span>-</span>
                              <span>{estimateReadingTime()} min</span>
                            </div>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Aucun document recent
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick access */}
                <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-extrabold">Acces rapide</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <Button variant="secondary" className="justify-start rounded-xl">
                      <BookOpen className="mr-2 h-4 w-4" /> Comment utiliser ce Wiki
                    </Button>
                    <Button variant="secondary" className="justify-start rounded-xl">
                      <Map className="mr-2 h-4 w-4" /> Parcours recommandes
                    </Button>
                    <Button variant="secondary" className="justify-start rounded-xl">
                      <Library className="mr-2 h-4 w-4" /> Templates & checklists
                    </Button>
                    <div className="rounded-xl border border-border/60 bg-background/20 p-3 text-xs text-muted-foreground">
                      Conseil : privilegier 2 niveaux max (dossier - doc). Au-dela, ajoute des liens
                      internes.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Documents table */}
              <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-extrabold">Documents</CardTitle>
                    {/* Section filter tabs - only in overview mode */}
                    {!selectedSection && !selectedFolderId && (
                      <Tabs value={tableFilter} onValueChange={setTableFilter}>
                        <TabsList className="h-8">
                          <TabsTrigger value="all" className="text-xs px-2 py-1">
                            Tous
                          </TabsTrigger>
                          {wikiSections.map((section) => (
                            <TabsTrigger key={section.id} value={section.id} className="text-xs px-2 py-1">
                              {section.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border/60 bg-background/15">
                    <ScrollArea className="h-[360px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[50%]">Titre</TableHead>
                            <TableHead>Mis à jour</TableHead>
                            <TableHead className="text-right">Temps</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allDocs.length > 0 ? (
                            allDocs.map((doc) => (
                              <TableRow
                                key={doc.id}
                                className="group cursor-pointer transition-colors hover:bg-muted/50"
                              >
                                <TableCell
                                  className="font-semibold"
                                  onClick={() => handleSelect(doc.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="truncate group-hover:text-primary transition-colors">{doc.title}</span>
                                  </div>
                                </TableCell>
                                <TableCell
                                  className="text-muted-foreground"
                                  onClick={() => handleSelect(doc.id)}
                                >
                                  {formatRelativeTime(doc.updatedAt)}
                                </TableCell>
                                <TableCell
                                  className="text-right text-muted-foreground"
                                  onClick={() => handleSelect(doc.id)}
                                >
                                  {estimateReadingTime()} min
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDocument(doc.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-8 text-center text-muted-foreground"
                              >
                                Aucun document. Créez votre premier document.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}
          </div>
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
        showSectionPicker
        selectedSection={folderSection}
        onSectionChange={setFolderSection}
      />

      <NewDocumentDialog
        open={showNewDocDialog}
        onOpenChange={setShowNewDocDialog}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleCreateDocument}
        isPending={isPending}
        showSectionPicker
        selectedSection={docSection}
        onSectionChange={setDocSection}
        selectedFolderId={docFolderId}
        onFolderChange={setDocFolderId}
        folders={folders}
      />
    </div>
  );
}
