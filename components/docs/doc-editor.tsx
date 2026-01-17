'use client';

import type { JSONContent } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { GripVertical, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDocEditor } from './hooks/useDocEditor';
import { EditorToolbar } from './editor-toolbar';
import { BubbleMenu } from './bubble-menu';
import { LinkDialog } from './dialogs/link-dialog';
import { ImageDialog } from './dialogs/image-dialog';

interface SaveResult {
  ok: boolean;
  skipped: boolean;
  updatedAt: string;
}

interface DocEditorProps {
  initialContent: JSONContent;
  initialTitle: string;
  onSave: (title: string, content: JSONContent) => Promise<SaveResult>;
  readOnly?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function DocEditor({ initialContent, initialTitle, onSave, readOnly = false }: DocEditorProps) {
  const {
    editor,
    title,
    handleTitleChange,
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
    addImage
  } = useDocEditor({ initialContent, initialTitle, onSave, readOnly });

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Titre du document"
          className="max-w-md border-0 text-lg font-semibold focus-visible:ring-0"
          disabled={readOnly}
        />
        {!readOnly && (
          <span className="text-xs text-muted-foreground">
            {saveError ? (
              <span className="flex flex-col items-end gap-0.5">
                <span className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {saveError}
                </span>
                {lastSaved && (
                  <span className="text-muted-foreground">
                    Derniere sauvegarde a {formatTime(lastSaved)}
                  </span>
                )}
              </span>
            ) : isSaving ? (
              'Sauvegarde en cours...'
            ) : isDirty ? (
              'Modifications non sauvegardees...'
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" />
                {lastSaveSkipped ? 'A jour' : `Sauvegarde a ${formatTime(lastSaved)}`}
              </span>
            ) : null}
          </span>
        )}
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onOpenLinkDialog={openLinkDialog}
          onOpenImageDialog={() => setShowImageDialog(true)}
        />
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {!readOnly && editor && (
          <>
            <BubbleMenu editor={editor} onOpenLinkDialog={openLinkDialog} />
            <DragHandle editor={editor}>
              <div className="flex h-6 w-6 cursor-grab items-center justify-center rounded hover:bg-muted active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </DragHandle>
          </>
        )}
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none dark:prose-invert focus:outline-none"
        />
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
    </div>
  );
}
