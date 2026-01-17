'use client';

import { useState, useMemo, useEffect } from 'react';
import { EditorContent, type JSONContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { Hash, Pencil, X, Check, AlertCircle, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDocEditor } from './hooks/useDocEditor';
import { EditorToolbar } from './editor-toolbar';
import { BubbleMenu } from './bubble-menu';
import { LinkDialog } from './dialogs/link-dialog';
import { ImageDialog } from './dialogs/image-dialog';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface SaveResult {
  ok: boolean;
  skipped: boolean;
  updatedAt: string;
}

interface DocContentViewProps {
  docId: string;
  title: string;
  content: JSONContent;
  updatedAt: string;
  createdBy: { name: string | null; email: string } | null;
  sectionLabel: string;
  folderName: string;
  onSave: (title: string, content: JSONContent) => Promise<SaveResult>;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 24) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function estimateReadingTime(content: JSONContent): number {
  let wordCount = 0;

  const countWords = (node: JSONContent) => {
    if (node.text) {
      wordCount += node.text.split(/\s+/).filter(Boolean).length;
    }
    if (node.content) {
      node.content.forEach(countWords);
    }
  };

  countWords(content);
  const minutes = Math.ceil(wordCount / 200);
  return Math.max(1, minutes);
}

function extractToc(content: JSONContent): TocItem[] {
  const toc: TocItem[] = [];
  let headingIndex = 0;

  const walkContent = (node: JSONContent) => {
    if (node.type === 'heading' && node.attrs?.level) {
      const text = node.content?.map((child) => child.text || '').join('') || '';

      if (text.trim()) {
        const id = `heading-${headingIndex++}`;
        toc.push({
          id,
          text: text.trim(),
          level: node.attrs.level as number,
        });
      }
    }

    if (node.content) {
      node.content.forEach(walkContent);
    }
  };

  walkContent(content);
  return toc;
}

function addHeadingIds(content: JSONContent): JSONContent {
  let headingIndex = 0;

  const processNode = (node: JSONContent): JSONContent => {
    if (node.type === 'heading') {
      return {
        ...node,
        attrs: {
          ...node.attrs,
          id: `heading-${headingIndex++}`,
        },
        content: node.content?.map(processNode),
      };
    }

    if (node.content) {
      return {
        ...node,
        content: node.content.map(processNode),
      };
    }

    return node;
  };

  return processNode(content);
}

function formatSaveTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function DocContentView({
  docId,
  title: initialTitle,
  content,
  updatedAt,
  createdBy,
  sectionLabel,
  folderName,
  onSave,
}: DocContentViewProps) {
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const toc = useMemo(() => extractToc(content), [content]);
  const processedContent = useMemo(() => addHeadingIds(content), [content]);
  const readingTime = useMemo(() => estimateReadingTime(content), [content]);
  const ownerName = createdBy?.name || createdBy?.email?.split('@')[0] || 'Inconnu';

  // Single editor using useDocEditor hook
  const {
    editor,
    title,
    isSaving,
    isDirty,
    lastSaved,
    lastSaveSkipped,
    saveError,
    showLinkDialog,
    setShowLinkDialog,
    linkUrl,
    setLinkUrl,
    addLink,
    openLinkDialog,
    showImageDialog,
    setShowImageDialog,
    imageUrl,
    setImageUrl,
    addImage,
  } = useDocEditor({
    initialContent: content,
    initialTitle: initialTitle,
    onSave,
    readOnly: !isEditing, // Controls autosave - only saves when editing
  });

  // Sync editor editable state with isEditing
  // This is needed because useEditor doesn't re-init when props change
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [editor, isEditing]);

  // Sync editor content when docId or content changes (e.g., after router.refresh or switching docs)
  useEffect(() => {
    if (editor && !isEditing) {
      editor.commands.setContent(content);
    }
  }, [editor, docId, content, isEditing]);

  // Intersection observer for TOC highlighting
  useEffect(() => {
    if (!toc.length || isEditing || !editor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0,
      }
    );

    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [toc, editor, isEditing]);

  // Add IDs to headings after editor mounts
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    const headings = editorElement.querySelectorAll('h1, h2, h3');

    headings.forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });
  }, [editor]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset editor content to original and exit edit mode
    if (editor) {
      editor.commands.setContent(content);
    }
    setIsEditing(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="flex gap-5">
        {/* Main content with border */}
        <div className="flex-1 min-w-0 rounded-2xl border border-border/70 bg-card/50">
          {/* Header block */}
          <div className="p-5 pb-0">
            {/* Section · Folder label */}
            <div className="mb-2 text-sm text-muted-foreground">
              {sectionLabel} · {folderName}
            </div>

            {/* Title */}
            <h1 className="mb-3 text-3xl font-bold">{isEditing ? title : initialTitle}</h1>

            {/* Badges + buttons - aligned vertically */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="rounded-full">
                Owner: {ownerName}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Maj: {formatRelativeTime(updatedAt)}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Lecture: {readingTime} min
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                {isEditing ? (
                  <>
                    {/* Save status */}
                    <span className="text-xs text-muted-foreground">
                      {saveError ? (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          {saveError}
                        </span>
                      ) : isSaving ? (
                        'Sauvegarde...'
                      ) : isDirty ? (
                        'Modifications non sauvegardées...'
                      ) : lastSaved ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="h-3 w-3" />
                          {lastSaveSkipped ? 'À jour' : `Sauvegardé à ${formatSaveTime(lastSaved)}`}
                        </span>
                      ) : null}
                    </span>
                    <Button onClick={handleCancelEdit} variant="outline" className="rounded-xl">
                      <X className="mr-2 h-4 w-4" />
                      Fermer
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEditClick} className="rounded-xl">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editer
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Toolbar when editing */}
          {isEditing && editor && (
            <div className="px-5 pt-4">
              <EditorToolbar
                editor={editor}
                onOpenLinkDialog={openLinkDialog}
                onOpenImageDialog={() => setShowImageDialog(true)}
              />
            </div>
          )}

          {/* Separator */}
          <div className="px-5 py-4">
            <Separator />
          </div>

          {/* Document content */}
          <div className="p-5 pt-0">
            {isEditing && editor && (
              <>
                <BubbleMenu editor={editor} onOpenLinkDialog={openLinkDialog} />
                <DragHandle editor={editor}>
                  <div className="flex h-6 w-6 cursor-grab items-center justify-center rounded hover:bg-muted active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </DragHandle>
              </>
            )}
            <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20">
              <EditorContent editor={editor} />
            </article>
          </div>
        </div>

        {/* TOC Sidebar - hidden when editing */}
        {!isEditing && (
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-0">
              <div className="rounded-2xl border border-border/70 bg-card/80">
                <div className="flex flex-col space-y-1.5 p-6 pb-2">
                  <h3 className="tracking-tight text-sm font-bold">Sommaire</h3>
                  <p className="text-xs text-muted-foreground">Navigation rapide</p>
                </div>
                <div className="px-6 py-2">
                  <Separator />
                </div>
                <div className="p-6 pt-0">
                  <ScrollArea className="max-h-[calc(100vh-300px)]">
                    <nav className="space-y-1">
                      {toc.length > 0 ? (
                        toc.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => scrollToHeading(item.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                              item.level === 1 && 'font-medium',
                              item.level === 2 && 'pl-4',
                              item.level === 3 && 'pl-6 text-xs',
                              activeHeading === item.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <Hash className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.text}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Aucun titre dans ce document
                        </p>
                      )}
                    </nav>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Dialogs */}
      <LinkDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        linkUrl={linkUrl}
        onLinkUrlChange={setLinkUrl}
        onApply={addLink}
      />
      <ImageDialog
        open={showImageDialog}
        onOpenChange={setShowImageDialog}
        imageUrl={imageUrl}
        onImageUrlChange={setImageUrl}
        onInsert={addImage}
      />
    </>
  );
}
