'use client';

import { useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNav } from './nav-context';

interface SecondarySidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function SecondarySidebar({ children, className }: SecondarySidebarProps) {
  const {
    isCompactMode,
    isSecondaryVisible,
    isSecondaryPinned,
    toggleSecondaryPinned,
    hideSecondary
  } = useNav();

  const sidebarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse enter on secondary sidebar
  const handleMouseEnter = useCallback(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Handle mouse leave from secondary sidebar
  const handleMouseLeave = useCallback(() => {
    if (!isCompactMode || isSecondaryPinned) return;

    // Add delay before hiding
    hideTimeoutRef.current = setTimeout(() => {
      hideSecondary();
    }, 150);
  }, [isCompactMode, isSecondaryPinned, hideSecondary]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle click outside to close (only in compact mode when not pinned)
  useEffect(() => {
    if (!isCompactMode || isSecondaryPinned || !isSecondaryVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        // Check if click is on main sidebar
        const mainSidebar = document.querySelector('[data-main-sidebar]');
        if (mainSidebar && mainSidebar.contains(e.target as Node)) {
          return; // Don't close if clicking on main sidebar
        }
        hideSecondary();
      }
    };

    // Add with delay to avoid immediate close
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isCompactMode, isSecondaryPinned, isSecondaryVisible, hideSecondary]);

  // In comfort mode, always show if there's content
  if (!isCompactMode) {
    return (
      <aside
        className={cn(
          'sticky top-0 h-screen w-[280px] shrink-0 border-r border-border/50 bg-secondary/60 backdrop-blur-sm',
          className
        )}
      >
        {children}
      </aside>
    );
  }

  // In compact mode, show/hide based on state
  return (
    <aside
      ref={sidebarRef}
      data-secondary-sidebar
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'fixed inset-y-0 left-[72px] z-30 w-[280px] border-r border-border/50 bg-secondary/90 backdrop-blur-md transition-all duration-200',
        isSecondaryVisible
          ? 'translate-x-0 opacity-100'
          : '-translate-x-full opacity-0 pointer-events-none',
        className
      )}
    >
      {/* Pin/Unpin button */}
      <button
        onClick={toggleSecondaryPinned}
        className={cn(
          'absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border transition',
          isSecondaryPinned
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground'
        )}
        title={isSecondaryPinned ? 'Détacher le menu' : 'Épingler le menu'}
      >
        {isSecondaryPinned ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="h-full overflow-y-auto pt-10">{children}</div>
    </aside>
  );
}
