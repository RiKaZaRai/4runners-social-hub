'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { EmojiItem } from '@/lib/tiptap/emoji-command';

export interface EmojiMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface EmojiMenuProps {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
}

export const EmojiMenu = forwardRef<EmojiMenuRef, EmojiMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }

        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) {
            command(item);
          }
          return true;
        }

        return false;
      }
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border bg-popover p-2 shadow-lg">
          <p className="text-sm text-muted-foreground">Aucun emoji trouve</p>
        </div>
      );
    }

    return (
      <div className="max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-lg">
        <div className="grid grid-cols-8 gap-1 p-2">
          {items.slice(0, 40).map((item, index) => (
            <button
              key={item.name}
              onClick={() => command(item)}
              className={`flex h-8 w-8 items-center justify-center rounded text-xl hover:bg-muted ${
                index === selectedIndex ? 'bg-muted ring-2 ring-primary' : ''
              }`}
              title={item.name}
            >
              {item.emoji}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <div className="border-t px-2 py-1">
            <p className="text-xs text-muted-foreground">
              {items[selectedIndex]?.name}
            </p>
          </div>
        )}
      </div>
    );
  }
);

EmojiMenu.displayName = 'EmojiMenu';
