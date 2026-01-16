'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image,
  Youtube
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlashCommandItem } from '@/lib/tiptap/slash-command';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image,
  Youtube
};

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      }
    }));

    if (items.length === 0) {
      return null;
    }

    return (
      <div className="z-50 w-72 rounded-lg border bg-popover p-1 shadow-lg">
        {items.map((item, index) => {
          const Icon = iconMap[item.icon];
          return (
            <button
              key={item.title}
              onClick={() => selectItem(index)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                'hover:bg-muted',
                index === selectedIndex && 'bg-muted'
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                {Icon && <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-medium">{item.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

SlashCommandMenu.displayName = 'SlashCommandMenu';
