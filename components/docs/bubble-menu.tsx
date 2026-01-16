'use client';

import { BubbleMenu as TipTapBubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BubbleMenuProps {
  editor: Editor;
  onOpenLinkDialog: () => void;
}

function BubbleButton({
  onClick,
  isActive,
  children,
  title
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1.5 hover:bg-white/20',
        isActive && 'bg-white/20'
      )}
    >
      {children}
    </button>
  );
}

export function BubbleMenu({ editor, onOpenLinkDialog }: BubbleMenuProps) {
  return (
    <TipTapBubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border bg-zinc-900 px-1 py-1 text-white shadow-xl"
    >
      <BubbleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Gras"
      >
        <Bold className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italique"
      >
        <Italic className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Barre"
      >
        <Strikethrough className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Code"
      >
        <Code className="h-4 w-4" />
      </BubbleButton>

      <div className="mx-1 h-4 w-px bg-white/30" />

      <BubbleButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        isActive={editor.isActive('highlight')}
        title="Surligner"
      >
        <Highlighter className="h-4 w-4" />
      </BubbleButton>
      <BubbleButton
        onClick={onOpenLinkDialog}
        isActive={editor.isActive('link')}
        title="Lien"
      >
        <LinkIcon className="h-4 w-4" />
      </BubbleButton>
    </TipTapBubbleMenu>
  );
}
