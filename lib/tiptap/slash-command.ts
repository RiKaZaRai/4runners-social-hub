import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: 'Texte',
    description: 'Paragraphe de texte simple',
    icon: 'Pilcrow',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    }
  },
  {
    title: 'Titre 1',
    description: 'Grand titre de section',
    icon: 'Heading1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    }
  },
  {
    title: 'Titre 2',
    description: 'Titre de sous-section',
    icon: 'Heading2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    }
  },
  {
    title: 'Titre 3',
    description: 'Petit titre',
    icon: 'Heading3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    }
  },
  {
    title: 'Liste a puces',
    description: 'Liste non ordonnee',
    icon: 'List',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    }
  },
  {
    title: 'Liste numerotee',
    description: 'Liste ordonnee',
    icon: 'ListOrdered',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    }
  },
  {
    title: 'Citation',
    description: 'Bloc de citation',
    icon: 'Quote',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    }
  },
  {
    title: 'Code',
    description: 'Bloc de code avec coloration',
    icon: 'Code',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    }
  },
  {
    title: 'Separateur',
    description: 'Ligne de separation horizontale',
    icon: 'Minus',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    }
  },
  {
    title: 'Image',
    description: 'Inserer une image via URL',
    icon: 'Image',
    command: ({ editor, range }) => {
      const url = window.prompt('URL de l\'image:');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    }
  },
  {
    title: 'YouTube',
    description: 'Integrer une video YouTube',
    icon: 'Youtube',
    command: ({ editor, range }) => {
      const url = window.prompt('URL de la video YouTube:');
      if (url) {
        editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
      }
    }
  }
];

export interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  selectedIndex: number;
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashCommandItem }) => {
          props.command({ editor, range });
        }
      },
      renderItems: null as ((props: SlashCommandListProps) => React.ReactNode) | null
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ];
  }
});
