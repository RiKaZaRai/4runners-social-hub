'use client';

import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface DocViewerProps {
  content: JSONContent;
  title: string;
}

export function DocViewer({ content, title }: DocViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline',
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    ],
    content,
    editable: false
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none dark:prose-invert"
      />
    </div>
  );
}
