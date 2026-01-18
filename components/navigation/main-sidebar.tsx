'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useCallback } from 'react';
import {
  Home,
  Inbox,
  Building2,
  FileText,
  Settings,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNav } from './nav-context';
import { Button } from '@/components/ui/button';

// Menu items configuration
const menuItems = [
  { id: 'home', href: '/home', icon: Home, label: 'Accueil' },
  { id: 'inbox', href: '/inbox', icon: Inbox, label: 'Inbox' },
  { id: 'spaces', href: '/spaces', icon: Building2, label: 'Espaces', hasSecondary: true },
  { id: 'wiki', href: '/wiki', icon: FileText, label: 'Wiki', hasSecondary: true }
] as const;

interface MainSidebarProps {
  userName: string;
  isClient: boolean;
  isAdmin: boolean;
  spacesPreview: Array<{
    id: string;
    name: string;
    modules: unknown;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  normalizeModules: (modules: any) => string[];
  canCreateClients: boolean;
}

export function MainSidebar({
  userName,
  isClient,
  isAdmin,
  spacesPreview,
  normalizeModules,
  canCreateClients
}: MainSidebarProps) {
  const pathname = usePathname();
  const { isCompactMode, showSecondary, hideSecondary, activePrimaryItem } = useNav();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter menu items based on user role
  const visibleItems = menuItems.filter((item) => {
    if (item.id === 'wiki' && isClient) return false;
    if (item.id === 'spaces' && isClient) return false;
    return true;
  });

  // Add posts for clients instead of spaces
  const clientItems = isClient
    ? [
        { id: 'home', href: '/home', icon: Home, label: 'Accueil' },
        { id: 'inbox', href: '/inbox', icon: Inbox, label: 'Inbox' },
        { id: 'posts', href: '/posts', icon: Building2, label: 'Posts' }
      ]
    : visibleItems;

  const items = isClient ? clientItems : visibleItems;

  // Check if a menu item is active
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Handle mouse enter with delay
  const handleMouseEnter = useCallback(
    (itemId: string, hasSecondary: boolean) => {
      if (!isCompactMode || !hasSecondary) return;

      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Add 120ms delay to avoid flicker
      hoverTimeoutRef.current = setTimeout(() => {
        showSecondary(itemId);
      }, 120);
    },
    [isCompactMode, showSecondary]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!isCompactMode) return;

    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Don't hide immediately - let the secondary sidebar handle it
  }, [isCompactMode]);

  // Render compact mode (< 1520px)
  if (isCompactMode) {
    return (
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[72px] flex-col overflow-y-auto bg-secondary/60">
        <div className="flex flex-col items-center px-2 py-4">
          <p className="text-[9px] font-bold tracking-wider text-muted-foreground">4R</p>
        </div>

        <nav className="flex flex-1 flex-col items-center gap-1 px-2 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const hasSecondary = 'hasSecondary' in item && item.hasSecondary;
            const isHovered = activePrimaryItem === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onMouseEnter={() => handleMouseEnter(item.id, hasSecondary)}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  'group flex w-full flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition',
                  active || isHovered
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-transparent hover:border-border/60 hover:bg-muted/50'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    active || isHovered
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] leading-tight',
                    active || isHovered ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
                {active && <span className="h-1 w-1 rounded-full bg-primary" />}
              </Link>
            );
          })}

          {/* Settings for admin */}
          {isAdmin && (
            <>
              <div className="my-2 h-px w-8 bg-border/50" />
              <Link
                href="/settings"
                className={cn(
                  'group flex w-full flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition',
                  isActive('/settings')
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-transparent hover:border-border/60 hover:bg-muted/50'
                )}
              >
                <Settings
                  className={cn(
                    'h-5 w-5',
                    isActive('/settings')
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] leading-tight',
                    isActive('/settings') ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  Params
                </span>
              </Link>
            </>
          )}
        </nav>
      </aside>
    );
  }

  // Render comfort mode (>= 1520px) - original layout
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-secondary/60">
      <div className="px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          4runners
        </p>
        <h1 className="text-lg font-semibold">Social Hub</h1>
        <p className="mt-1 text-xs text-muted-foreground">{userName}</p>
      </div>

      <nav className="flex-1 space-y-6 px-4 py-5 text-sm">
        {/* Menu principal */}
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                  active
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border/60 bg-background/20 hover:bg-muted/50'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span className="flex-1 font-semibold text-foreground/90">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>

        {/* Section Espaces */}
        <div className="rounded-xl bg-muted/30 px-3 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Espaces</p>
            {canCreateClients && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/spaces/new">Nouveau</Link>
              </Button>
            )}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {spacesPreview.map((space) => {
              const modules = normalizeModules(space.modules);
              const hasSocial = modules.includes('social');
              return (
                <li key={space.id}>
                  <Link
                    className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
                    href={`/spaces/${space.id}/overview`}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{space.name}</span>
                  </Link>
                  {hasSocial && (
                    <Link
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      href={`/spaces/${space.id}/social`}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Réseaux
                    </Link>
                  )}
                </li>
              );
            })}
            {spacesPreview.length === 0 && (
              <li className="rounded-md bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
                Aucun espace.
              </li>
            )}
          </ul>
          {spacesPreview.length > 0 && (
            <Link
              href="/spaces"
              className="mt-3 block text-xs text-muted-foreground hover:text-foreground"
            >
              Voir tous les espaces →
            </Link>
          )}
        </div>

        {/* Parametres - admin only */}
        {isAdmin && (
          <div className="space-y-1">
            <p className="px-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Administration
            </p>
            <Link
              href="/settings"
              className={cn(
                'group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                isActive('/settings')
                  ? 'border-primary/30 bg-primary/10'
                  : 'border-border/60 bg-background/20 hover:bg-muted/50'
              )}
            >
              <Settings
                className={cn(
                  'h-4 w-4',
                  isActive('/settings')
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="flex-1 font-semibold text-foreground/90">Parametres</span>
              {isActive('/settings') && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
