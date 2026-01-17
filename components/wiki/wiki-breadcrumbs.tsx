'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface WikiBreadcrumbsProps {
  trail: BreadcrumbItem[];
  onSelect: (id: string) => void;
}

export function WikiBreadcrumbs({ trail, onSelect }: WikiBreadcrumbsProps) {
  if (!trail.length) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm">
      {trail.map((item, idx) => (
        <span key={item.id} className="flex items-center gap-1">
          {idx > 0 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          )}
          <button
            onClick={() => onSelect(item.id)}
            className={cn(
              'rounded px-1 py-0.5 transition-colors hover:bg-muted',
              idx === trail.length - 1
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={idx === trail.length - 1 ? 'page' : undefined}
          >
            {item.title}
          </button>
        </span>
      ))}
    </nav>
  );
}
