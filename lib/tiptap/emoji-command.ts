import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

// Liste d'emojis courants
export const emojiItems: EmojiItem[] = [
  // Smileys
  { emoji: '😀', name: 'sourire', keywords: ['happy', 'smile', 'heureux'] },
  { emoji: '😊', name: 'sourire timide', keywords: ['blush', 'smile', 'shy'] },
  { emoji: '😂', name: 'rire aux larmes', keywords: ['laugh', 'lol', 'funny'] },
  { emoji: '🤣', name: 'mort de rire', keywords: ['rofl', 'laugh'] },
  { emoji: '😍', name: 'yeux coeurs', keywords: ['love', 'heart', 'amour'] },
  { emoji: '🥰', name: 'amoureux', keywords: ['love', 'heart', 'adore'] },
  { emoji: '😎', name: 'cool', keywords: ['sunglasses', 'cool'] },
  { emoji: '🤔', name: 'pensif', keywords: ['think', 'hmm', 'penser'] },
  { emoji: '😢', name: 'triste', keywords: ['sad', 'cry', 'pleure'] },
  { emoji: '😭', name: 'pleure', keywords: ['cry', 'sad', 'tears'] },
  { emoji: '😱', name: 'choque', keywords: ['shock', 'scared', 'peur'] },
  { emoji: '😡', name: 'en colere', keywords: ['angry', 'mad', 'colere'] },
  { emoji: '🤯', name: 'esprit explose', keywords: ['mind blown', 'wow'] },
  { emoji: '🥳', name: 'fete', keywords: ['party', 'celebrate', 'fete'] },
  { emoji: '😴', name: 'dort', keywords: ['sleep', 'tired', 'fatigue'] },

  // Gestes
  { emoji: '👍', name: 'pouce haut', keywords: ['thumbs up', 'ok', 'good', 'bien'] },
  { emoji: '👎', name: 'pouce bas', keywords: ['thumbs down', 'bad', 'mal'] },
  { emoji: '👏', name: 'applaudir', keywords: ['clap', 'bravo', 'applause'] },
  { emoji: '🙌', name: 'mains levees', keywords: ['hands', 'celebrate', 'yeah'] },
  { emoji: '🤝', name: 'poignee de main', keywords: ['handshake', 'deal', 'accord'] },
  { emoji: '✌️', name: 'victoire', keywords: ['peace', 'victory', 'v'] },
  { emoji: '🤞', name: 'doigts croises', keywords: ['fingers crossed', 'luck'] },
  { emoji: '💪', name: 'muscle', keywords: ['strong', 'muscle', 'force'] },
  { emoji: '👋', name: 'salut', keywords: ['wave', 'hello', 'bye', 'salut'] },
  { emoji: '🙏', name: 'merci', keywords: ['pray', 'thanks', 'please', 'merci'] },

  // Coeurs et symboles
  { emoji: '❤️', name: 'coeur rouge', keywords: ['heart', 'love', 'coeur'] },
  { emoji: '💙', name: 'coeur bleu', keywords: ['heart', 'blue'] },
  { emoji: '💚', name: 'coeur vert', keywords: ['heart', 'green'] },
  { emoji: '💛', name: 'coeur jaune', keywords: ['heart', 'yellow'] },
  { emoji: '🧡', name: 'coeur orange', keywords: ['heart', 'orange'] },
  { emoji: '💜', name: 'coeur violet', keywords: ['heart', 'purple'] },
  { emoji: '🖤', name: 'coeur noir', keywords: ['heart', 'black'] },
  { emoji: '💯', name: 'cent', keywords: ['100', 'perfect', 'score'] },
  { emoji: '✨', name: 'etincelles', keywords: ['sparkle', 'magic', 'star'] },
  { emoji: '🔥', name: 'feu', keywords: ['fire', 'hot', 'lit'] },
  { emoji: '⭐', name: 'etoile', keywords: ['star', 'favorite'] },
  { emoji: '🌟', name: 'etoile brillante', keywords: ['star', 'glow'] },

  // Objets
  { emoji: '📌', name: 'punaise', keywords: ['pin', 'important'] },
  { emoji: '📎', name: 'trombone', keywords: ['paperclip', 'attach'] },
  { emoji: '📝', name: 'memo', keywords: ['note', 'write', 'memo'] },
  { emoji: '📅', name: 'calendrier', keywords: ['calendar', 'date'] },
  { emoji: '📊', name: 'graphique', keywords: ['chart', 'stats', 'graph'] },
  { emoji: '📈', name: 'hausse', keywords: ['chart', 'up', 'growth'] },
  { emoji: '📉', name: 'baisse', keywords: ['chart', 'down', 'decline'] },
  { emoji: '💡', name: 'ampoule', keywords: ['idea', 'light', 'idee'] },
  { emoji: '🎯', name: 'cible', keywords: ['target', 'goal', 'objectif'] },
  { emoji: '🏆', name: 'trophee', keywords: ['trophy', 'win', 'champion'] },
  { emoji: '🎉', name: 'confetti', keywords: ['party', 'celebrate', 'tada'] },
  { emoji: '🚀', name: 'fusee', keywords: ['rocket', 'launch', 'fast'] },
  { emoji: '⚡', name: 'eclair', keywords: ['lightning', 'fast', 'energy'] },
  { emoji: '💻', name: 'ordinateur', keywords: ['computer', 'laptop', 'pc'] },
  { emoji: '📱', name: 'telephone', keywords: ['phone', 'mobile', 'smartphone'] },

  // Statuts
  { emoji: '✅', name: 'valide', keywords: ['check', 'done', 'ok', 'valid'] },
  { emoji: '❌', name: 'croix', keywords: ['cross', 'no', 'wrong', 'erreur'] },
  { emoji: '⚠️', name: 'attention', keywords: ['warning', 'alert', 'danger'] },
  { emoji: '❓', name: 'question', keywords: ['question', 'help', 'ask'] },
  { emoji: '❗', name: 'exclamation', keywords: ['exclamation', 'important'] },
  { emoji: '💬', name: 'bulle', keywords: ['comment', 'chat', 'message'] },
  { emoji: '🔗', name: 'lien', keywords: ['link', 'url', 'chain'] },
  { emoji: '📢', name: 'megaphone', keywords: ['announce', 'loud', 'speaker'] },
  { emoji: '🔔', name: 'cloche', keywords: ['bell', 'notification', 'alert'] },
  { emoji: '🔒', name: 'cadenas', keywords: ['lock', 'secure', 'private'] },
  { emoji: '🔓', name: 'cadenas ouvert', keywords: ['unlock', 'open'] },

  // Nature
  { emoji: '☀️', name: 'soleil', keywords: ['sun', 'sunny', 'weather'] },
  { emoji: '🌙', name: 'lune', keywords: ['moon', 'night'] },
  { emoji: '⛅', name: 'nuage soleil', keywords: ['cloud', 'weather'] },
  { emoji: '🌈', name: 'arc en ciel', keywords: ['rainbow', 'colors'] },
  { emoji: '🌸', name: 'fleur cerisier', keywords: ['flower', 'cherry', 'spring'] },
  { emoji: '🌺', name: 'hibiscus', keywords: ['flower', 'tropical'] },
  { emoji: '🌻', name: 'tournesol', keywords: ['sunflower', 'flower'] },
  { emoji: '🍀', name: 'trefle', keywords: ['clover', 'luck', 'chance'] }
];

export const EmojiCommand = Extension.create({
  name: 'emojiCommand',

  addOptions() {
    return {
      suggestion: {
        char: ':',
        command: ({ editor, range, props }: { editor: any; range: any; props: EmojiItem }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(props.emoji)
            .run();
        }
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('emojiSuggestion'),
        ...this.options.suggestion
      })
    ];
  }
});
