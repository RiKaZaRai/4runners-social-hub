'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WikiNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/wiki' || pathname.startsWith('/wiki/');

  // If already on wiki, add reset param to force overview
  const href = isActive ? '/wiki?reset=1' : '/wiki';

  return (
    <Link
      className={cn(
        'group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
        isActive
          ? 'border-border/60 bg-background/30'
          : 'border-transparent hover:border-border/60 hover:bg-background/20'
      )}
      href={href}
    >
      <FileText
        className={cn(
          'h-4 w-4',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span
        className={cn(
          'flex-1 font-semibold',
          isActive ? 'text-foreground' : 'text-foreground/90'
        )}
      >
        Wiki
      </span>
      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}
