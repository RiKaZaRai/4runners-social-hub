'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Home, Inbox, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
  home: Home,
  inbox: Inbox,
  building: Building2,
  settings: Settings,
} as const;

type IconName = keyof typeof icons;

interface NavLinkProps {
  href: string;
  icon: IconName;
  children: React.ReactNode;
  exact?: boolean;
}

export function NavLink({ href, icon, children, exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  const Icon = icons[icon];

  return (
    <Link
      className={cn(
        'group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
        isActive
          ? 'border-border bg-primary/10'
          : 'border-border/60 bg-background/20 hover:bg-muted/50'
      )}
      href={href}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span className="flex-1 font-semibold text-foreground/90">
        {children}
      </span>
      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}
