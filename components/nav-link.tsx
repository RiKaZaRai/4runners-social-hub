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
        'flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted',
        isActive && 'bg-primary/10 text-primary'
      )}
      href={href}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
