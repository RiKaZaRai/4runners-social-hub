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
        'flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted',
        isActive && 'bg-primary/10 text-primary'
      )}
      href={href}
    >
      <FileText className="h-4 w-4" />
      Wiki
    </Link>
  );
}
