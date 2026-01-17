'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FolderPlus,
  FileText,
  Star,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  User,
  Rocket,
  Boxes,
  Library,
  CornerDownLeft,
  Folder,
  Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NewFolderDialog } from '@/components/docs/dialogs/folder-dialogs';
import { NewDocumentDialog } from '@/components/docs/dialogs/document-dialogs';
import { createFolder, createDocument } from '@/lib/actions/documents';
import { cn } from '@/lib/utils';
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
  updatedAt?: string;
}

// Navigation sections for sidebar (collapsible categories)
const navSections = [
  { id: 'go-live', label: 'Go Live', icon: Rocket },
  { id: 'urgence', label: 'Urgence', icon: Sparkles },
  { id: 'setup-projet', label: 'Setup projet', icon: Boxes },
  { id: 'client', label: 'Client', icon: User },
  { id: 'outils', label: 'Outils', icon: Library },
  { id: 'reference', label: 'References', icon: BookOpen },
];

// Build flat index for search
function buildWikiIndex(
  folders: FolderWithChildren[],
  documents: DocumentSummary[]
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

// Helper to check if a folder belongs to a section
function folderBelongsToSection(folder: FolderWithChildren, sectionId: string, sectionLabel: string): boolean {
  return (
    folder.name.toUpperCase().startsWith(`[${sectionId.toUpperCase()}]`) ||
    folder.name.toUpperCase().includes(sectionLabel.toUpperCase())
  );
}

// Helper to get section for a folder
function getFolderSection(folder: FolderWithChildren): { id: string; label: string } | null {
  for (const section of navSections) {
    if (folderBelongsToSection(folder, section.id, section.label)) {
      return { id: section.id, label: section.label };
    }
  }
  return null;
}

export function WikiStructured({
  folders,
  documents,
  basePath,
  tenantId = null,
}: WikiStructuredProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

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

  // Build flat index for search
  const index = useMemo(() => buildWikiIndex(folders, documents), [folders, documents]);

  // Get current selected folder object
  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, folders]);

  // Get current section object
  const currentSectionObj = useMemo(() => {
    if (selectedSection) {
      return navSections.find((s) => s.id === selectedSection) || null;
    }
    return null;
  }, [selectedSection]);

  // Filter folders and documents based on current context
  const contextFolders = useMemo(() => {
    if (selectedFolderId) {
      // If a folder is selected, show its children (subfolders)
      const folder = folders.find((f) => f.id === selectedFolderId);
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

  // All docs for table - filtered by context
  const allDocs = useMemo(() => {
    return [...contextDocuments].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [contextDocuments]);

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
        router.push(`${basePath}/${id}/edit`);
      }
      setQuery('');
      setIsSearchOpen(false);
    },
    [index, router, basePath]
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
    setSelectedFolderId(null); // Clear folder selection when selecting a section
  };

  // Handle folder click
  const handleFolderClick = (folderId: string, sectionId: string) => {
    setSelectedFolderId(folderId);
    setSelectedSection(sectionId); // Keep section context
  };

  // Navigate back to overview
  const handleBackToOverview = () => {
    setSelectedSection(null);
    setSelectedFolderId(null);
  };

  // Navigate back to section
  const handleBackToSection = () => {
    setSelectedFolderId(null);
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
        await createFolder(tenantId, null, folderName);
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
        const doc = await createDocument(tenantId, docFolderId, inputValue.trim());
        setShowNewDocDialog(false);
        setInputValue('');
        setDocSection('');
        setDocFolderId(null);
        router.push(`${basePath}/${doc.id}/edit`);
      } catch (error) {
        console.error('Failed to create document:', error);
      }
    });
  };

  return (
    <div className="min-h-full text-foreground">
      {/* Gradient background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(900px_520px_at_18%_8%,rgba(59,130,246,0.10),transparent_62%),radial-gradient(780px_460px_at_82%_16%,rgba(139,92,246,0.08),transparent_62%)] bg-background" />

      <div className="grid grid-cols-[280px_1fr] h-full">
        {/* SIDEBAR */}
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
                {navSections.map((section) => {
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
                            return (
                              <button
                                key={folder.id}
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
                    !selectedSection ? 'text-foreground' : 'text-foreground/85'
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
                        !selectedFolderId ? 'font-semibold text-foreground' : ''
                      )}
                    >
                      {currentSectionObj.label}
                    </button>
                  </>
                )}
                {selectedFolder && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">
                      {selectedFolder.name.replace(/^\[.*?\]\s*/, '')}
                    </span>
                  </>
                )}
                {!selectedSection && !selectedFolderId && (
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

              {/* Documents table with tabs */}
              <Card className="rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-extrabold">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="rounded-xl bg-background/30">
                      <TabsTrigger value="all" className="rounded-lg">
                        Tous
                      </TabsTrigger>
                      <TabsTrigger value="process" className="rounded-lg">
                        Process
                      </TabsTrigger>
                      <TabsTrigger value="roles" className="rounded-lg">
                        Roles
                      </TabsTrigger>
                      <TabsTrigger value="templates" className="rounded-lg">
                        Templates
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                      <div className="rounded-xl border border-border/60 bg-background/15">
                        <ScrollArea className="h-[360px]">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[45%]">Titre</TableHead>
                                <TableHead>Categorie</TableHead>
                                <TableHead>Mis a jour</TableHead>
                                <TableHead className="text-right">Temps</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allDocs.length > 0 ? (
                                allDocs.map((doc) => (
                                  <TableRow
                                    key={doc.id}
                                    className="cursor-pointer hover:bg-background/25"
                                    onClick={() => handleSelect(doc.id)}
                                  >
                                    <TableCell className="font-semibold">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="truncate">{doc.title}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="rounded-full">
                                        Doc
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {formatRelativeTime(doc.updatedAt)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      {estimateReadingTime()} min
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="py-8 text-center text-muted-foreground"
                                  >
                                    Aucun document. Creez votre premier document.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="process" className="mt-4 text-sm text-muted-foreground">
                      Filtre Process (a venir)
                    </TabsContent>
                    <TabsContent value="roles" className="mt-4 text-sm text-muted-foreground">
                      Filtre Roles (a venir)
                    </TabsContent>
                    <TabsContent value="templates" className="mt-4 text-sm text-muted-foreground">
                      Filtre Templates (a venir)
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
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
