'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, FolderPlus, FilePlus, FileText, Folder, CornerDownLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WikiIndexItem } from './wiki-data';

interface WikiTopbarProps {
  index: WikiIndexItem[];
  onOpen: (id: string) => void;
  onNewFolder?: () => void;
  onNewDocument?: () => void;
}

export function WikiTopbar({ index, onOpen, onNewFolder, onNewDocument }: WikiTopbarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Filter results based on query
  const results = query.trim()
    ? index
        .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : [];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onOpen(id);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Wiki</div>
            <div className="text-xs text-muted-foreground">Structuré (rôle / process / module)</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher dans le wiki (rôle, process, module...)"
            className="pl-9"
            aria-label="Rechercher dans le wiki"
            aria-expanded={isOpen && results.length > 0}
            aria-controls="wiki-search-results"
            aria-activedescendant={
              results[selectedIndex] ? `wiki-result-${results[selectedIndex].id}` : undefined
            }
          />

          {/* Search results dropdown */}
          {isOpen && results.length > 0 && (
            <div
              ref={resultsRef}
              id="wiki-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg"
            >
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  id={`wiki-result-${result.id}`}
                  role="option"
                  aria-selected={idx === selectedIndex}
                  onClick={() => handleSelect(result.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm',
                    idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  {result.type === 'doc' ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    {result.parents.length > 0 && (
                      <div className="text-xs text-muted-foreground truncate">
                        {result.parents.map((p) => p.title).join(' / ')}
                      </div>
                    )}
                  </div>
                  <CornerDownLeft className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onNewFolder && (
            <Button variant="outline" size="sm" onClick={onNewFolder}>
              <FolderPlus className="mr-1 h-4 w-4" />
              Dossier
            </Button>
          )}
          {onNewDocument && (
            <Button size="sm" onClick={onNewDocument}>
              <FilePlus className="mr-1 h-4 w-4" />
              Document
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
