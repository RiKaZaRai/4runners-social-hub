'use client';

import { useNav } from '@/components/navigation';
import { cn } from '@/lib/utils';

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const { isCompactMode, isSecondaryPinned } = useNav();

  // In compact mode, add margin when secondary is pinned
  // The sidebar is fixed positioned, so we need margin to prevent content overlap
  const showPinnedMargin = isCompactMode && isSecondaryPinned;

  return (
    <div className={cn(
      // Negative margin to counteract parent padding, wiki manages its own layout
      '-mx-6 -my-6 min-h-[calc(100vh-4rem)]',
      showPinnedMargin && 'ml-[256px]' // 280px sidebar - 24px (6*4) parent margin
    )}>
      {children}
    </div>
  );
}
