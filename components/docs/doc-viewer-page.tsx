'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { common, createLowlight } from 'lowlight';
import { ChevronRight, Hash, AlertTriangle, Info, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface DocViewerPageProps {
  docId: string;
  title: string;
  content: JSONContent;
  updatedAt: string;
  createdBy: { name: string | null; email: string } | null;
  breadcrumb?: { label: string; href?: string }[];
  basePath: string;
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
  // Count words in the document
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

  // Average reading speed: 200 words per minute
  const minutes = Math.ceil(wordCount / 200);
  return Math.max(1, minutes);
}

function extractToc(content: JSONContent): TocItem[] {
  const toc: TocItem[] = [];
  let headingIndex = 0;

  const walkContent = (node: JSONContent) => {
    if (node.type === 'heading' && node.attrs?.level) {
      const text = node.content
        ?.map((child) => child.text || '')
        .join('') || '';

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

// Custom extension to add IDs to headings
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

export function DocViewerPage({
  docId,
  title,
  content,
  updatedAt,
  createdBy,
  breadcrumb = [],
  basePath,
}: DocViewerPageProps) {
  const router = useRouter();
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  // Extract TOC from content
  const toc = useMemo(() => extractToc(content), [content]);

  // Process content to add heading IDs
  const processedContent = useMemo(() => addHeadingIds(content), [content]);

  // Reading time
  const readingTime = useMemo(() => estimateReadingTime(content), [content]);

  // Owner name
  const ownerName = createdBy?.name || createdBy?.email?.split('@')[0] || 'Inconnu';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'scroll-mt-20',
          },
        },
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      HorizontalRule,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'rounded-lg w-full aspect-video',
        },
      }),
    ],
    content: processedContent,
    editable: false,
  });

  // Intersection observer for TOC highlighting
  useEffect(() => {
    if (!toc.length) return;

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

    // Observe all headings
    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [toc, editor]);

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

  const handleEdit = () => {
    router.push(`${basePath}/${docId}/edit`);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumb.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {item.href ? (
                  <button
                    onClick={() => router.push(item.href!)}
                    className="hover:text-foreground transition"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="mb-4 text-3xl font-bold">{title}</h1>

          {/* Metadata badges */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="rounded-full">
              Owner: {ownerName}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              Maj: {formatRelativeTime(updatedAt)}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              Lecture: {readingTime} min
            </Badge>
            <div className="ml-auto">
              <Button onClick={handleEdit} className="rounded-xl">
                <Pencil className="mr-2 h-4 w-4" />
                Editer
              </Button>
            </div>
          </div>

          {/* Document content */}
          <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20">
            <EditorContent editor={editor} />
          </article>
        </div>
      </main>

      {/* TOC Sidebar */}
      <aside className="hidden w-72 shrink-0 border-l bg-muted/30 lg:block">
        <div className="sticky top-0 p-6">
          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Sommaire</CardTitle>
              <p className="text-xs text-muted-foreground">Navigation rapide</p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-200px)]">
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
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
