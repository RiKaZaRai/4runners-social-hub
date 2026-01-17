'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, ReactRenderer } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Indent as IndentExtension } from '@/lib/tiptap/indent-extension';
import { SlashCommand, slashCommandItems } from '@/lib/tiptap/slash-command';
import { EmojiCommand, emojiItems } from '@/lib/tiptap/emoji-command';
import { SlashCommandMenu, type SlashCommandMenuRef } from '../slash-command-menu';
import { EmojiMenu, type EmojiMenuRef } from '../emoji-menu';
import { common, createLowlight } from 'lowlight';
import tippy, { type Instance as TippyInstance } from 'tippy.js';

const lowlight = createLowlight(common);

interface SaveResult {
  ok: boolean;
  skipped: boolean;
  updatedAt: string;
}

interface UseDocEditorProps {
  initialContent: JSONContent;
  initialTitle: string;
  onSave: (title: string, content: JSONContent) => Promise<SaveResult>;
  readOnly?: boolean;
}

const AUTOSAVE_DELAY = 2000; // 2 seconds debounce
const MAX_RETRY_DELAY = 30000; // 30 seconds max backoff

export function useDocEditor({ initialContent, initialTitle, onSave, readOnly = false }: UseDocEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dialog states
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Autosave refs
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleRef = useRef(title);
  const retryCountRef = useRef(0);
  const savingRef = useRef(false); // Synchronous lock to prevent race conditions
  const readOnlyRef = useRef(readOnly);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        codeBlock: false,
        horizontalRule: false,
        link: false // Disabled because we add Link separately with custom config
      }),
      Placeholder.configure({
        placeholder: 'Tapez "/" pour voir les commandes disponibles...'
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Highlight.configure({
        multicolor: true
      }),
      TextStyle,
      Color,
      HorizontalRule,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full'
        }
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'rounded-lg w-full aspect-video'
        }
      }),
      IndentExtension,
      SlashCommand.configure({
        suggestion: {
          char: '/',
          items: ({ query }: { query: string }) => {
            return slashCommandItems.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase())
            );
          },
          render: () => {
            let component: ReactRenderer<SlashCommandMenuRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(SlashCommandMenu, {
                  props,
                  editor: props.editor
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start'
                });
              },
              onUpdate: (props: any) => {
                component?.updateProps(props);

                if (!props.clientRect) return;

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect
                });
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              }
            };
          }
        }
      }),
      EmojiCommand.configure({
        suggestion: {
          char: ':',
          items: ({ query }: { query: string }) => {
            if (!query) return emojiItems.slice(0, 40);
            const lowerQuery = query.toLowerCase();
            return emojiItems.filter(
              (item) =>
                item.name.toLowerCase().includes(lowerQuery) ||
                item.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
            ).slice(0, 40);
          },
          render: () => {
            let component: ReactRenderer<EmojiMenuRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(EmojiMenu, {
                  props,
                  editor: props.editor
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start'
                });
              },
              onUpdate: (props: any) => {
                component?.updateProps(props);

                if (!props.clientRect) return;

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect
                });
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              }
            };
          }
        }
      })
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: () => {
      setIsDirty(true);
    }
  });

  // Keep refs in sync
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  const handleSave = useCallback(async () => {
    if (!editor || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await onSave(titleRef.current, editor.getJSON());
      setIsDirty(false);
      // Use server's updatedAt for accurate timestamp
      setLastSaved(new Date(result.updatedAt));
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      // Aborted requests (cancelled by a newer save) - no error UI, no retry
      if (error instanceof DOMException && error.name === 'AbortError') {
        // noop - just unlock and let next save proceed
      } else {
        console.error('Save failed:', error);
        setSaveError('Erreur de sauvegarde');

        // Exponential backoff with jitter for retry
        retryCountRef.current += 1;
        const baseDelay = Math.min(
          AUTOSAVE_DELAY * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY
        );
        // Jitter: 80% to 120% of base delay
        const jitter = 0.8 + Math.random() * 0.4;
        const delayWithJitter = baseDelay * jitter;

        // Schedule retry (skip if readOnly changed)
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = setTimeout(() => {
          if (!readOnlyRef.current) handleSave();
        }, delayWithJitter);
      }
    } finally {
      // Always unlock - single source of truth
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [editor, onSave]);

  // Autosave effect
  useEffect(() => {
    if (readOnly || !isDirty || !editor) return;

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer for autosave
    autosaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, AUTOSAVE_DELAY);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isDirty, readOnly, editor, handleSave]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
  };

  const addLink = () => {
    if (!editor) return;

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }

    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const openLinkDialog = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setShowLinkDialog(true);
  };

  const addImage = () => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setShowImageDialog(false);
    setImageUrl('');
  };

  return {
    // Editor instance
    editor,

    // Title state
    title,
    handleTitleChange,

    // Save state
    isSaving,
    isDirty,
    lastSaved,
    saveError,
    handleSave,

    // Link dialog
    showLinkDialog,
    setShowLinkDialog,
    linkUrl,
    setLinkUrl,
    addLink,
    openLinkDialog,

    // Image dialog
    showImageDialog,
    setShowImageDialog,
    imageUrl,
    setImageUrl,
    addImage
  };
}
