'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Folder, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { wikiSections } from '@/lib/wiki-sections';
import type { FolderWithChildren, DocumentSummary } from '@/lib/actions/documents';

interface WikiSidebarProps {
  folders: FolderWithChildren[];
  documents: DocumentSummary[];
  basePath: string;
  currentDocId?: string;
}

// Helper to check if a folder belongs to a section
function folderBelongsToSection(
  folder: FolderWithChildren,
  sectionId: string,
  sectionLabel: string
): boolean {
  return (
    folder.name.toUpperCase().startsWith(`[${sectionId.toUpperCase()}]`) ||
    folder.name.toUpperCase().includes(sectionLabel.toUpperCase())
  );
}

export function WikiSidebar({
  folders,
  documents,
  basePath,
  currentDocId,
}: WikiSidebarProps) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Toggle section expand/collapse
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Toggle folder expand/collapse
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  return (
    <aside className="sticky top-0 h-screen w-[280px] shrink-0 border-r border-border/50 bg-secondary/60 backdrop-blur-sm">
      <div className="p-4">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
          <button
            onClick={() => router.push(basePath)}
            className="flex w-full items-center gap-2 text-left"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-background/40">
              <Sparkles className="h-4 w-4 opacity-80" />
            </div>
            <div className="min-w-0">
              <div className="text-xs tracking-widest text-muted-foreground">WIKI</div>
              <div className="truncate text-base font-extrabold">Base documentaire</div>
            </div>
          </button>

          <Separator className="my-4" />

          <div className="grid gap-2">
            {wikiSections.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSections[section.id];
              // Filter folders that belong to this section
              const sectionFolders = folders.filter((f) =>
                folderBelongsToSection(f, section.id, section.label)
              );

              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                      isExpanded
                        ? 'border-border/60 bg-background/30'
                        : 'border-border/60 bg-background/20 hover:bg-background/35'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isExpanded
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 font-semibold',
                        isExpanded ? 'text-foreground' : 'text-foreground/90'
                      )}
                    >
                      {section.label}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-2 space-y-1 border-l border-border/50 pl-3">
                      {sectionFolders.map((folder) => {
                        const isFolderExpanded = expandedFolders[folder.id];
                        const folderDocs = documents.filter((d) => d.folderId === folder.id);
                        return (
                          <div key={folder.id}>
                            <button
                              onClick={() => toggleFolder(folder.id)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                                isFolderExpanded
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-background/35 hover:text-foreground'
                              )}
                            >
                              <Folder className="h-3.5 w-3.5" />
                              <span className="truncate">
                                {folder.name.replace(/^\[.*?\]\s*/, '')}
                              </span>
                              {isFolderExpanded && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                              )}
                            </button>
                            {isFolderExpanded && folderDocs.length > 0 && (
                              <div className="ml-4 mt-1 space-y-0.5 border-l border-border/40 pl-2">
                                {folderDocs.map((doc) => {
                                  const isCurrentDoc = doc.id === currentDocId;
                                  return (
                                    <button
                                      key={doc.id}
                                      onClick={() => router.push(`${basePath}/${doc.id}`)}
                                      className={cn(
                                        'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition',
                                        isCurrentDoc
                                          ? 'bg-primary/10 text-primary font-medium'
                                          : 'text-muted-foreground hover:bg-background/35 hover:text-foreground'
                                      )}
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span className="truncate">{doc.title}</span>
                                      {isCurrentDoc && (
                                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                                      )}
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
  );
}
