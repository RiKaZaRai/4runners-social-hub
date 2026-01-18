'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { CsrfInput } from '@/components/csrf-input';
import { NavProvider, MainSidebar, useNav } from '@/components/navigation';
import { GlobalSecondarySidebar } from '@/components/navigation/global-secondary-sidebar';
import type { FolderWithChildren, DocumentSummary } from '@/lib/actions/documents';

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  isClient: boolean;
  isAdmin: boolean;
  spacesPreview: Array<{
    id: string;
    name: string;
    modules: string[];
  }>;
  canCreateClients: boolean;
  wikiData: {
    folders: FolderWithChildren[];
    documents: DocumentSummary[];
  } | null;
}

function DashboardContent({
  children,
  userName,
  isClient,
  isAdmin,
  spacesPreview,
  canCreateClients,
  wikiData
}: DashboardShellProps) {
  const { isCompactMode } = useNav();

  // Only handle main sidebar margin - secondary sidebar is handled by route layouts
  const mainMargin = isCompactMode ? 'ml-[72px]' : 'ml-64';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainSidebar
        userName={userName}
        isClient={isClient}
        isAdmin={isAdmin}
        spacesPreview={spacesPreview}
        canCreateClients={canCreateClients}
      />

      {/* Global secondary sidebar */}
      <GlobalSecondarySidebar wikiData={wikiData} />

      <div className={`flex min-h-screen flex-1 flex-col transition-[margin] duration-200 ${mainMargin}`}>
        <header className="flex items-center justify-between bg-card/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <Input
              className="w-[280px] rounded-full bg-background"
              placeholder="Rechercher..."
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action="/api/auth/logout" method="post">
              <CsrfInput />
              <Button variant="outline" size="sm">
                Se deconnecter
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <NavProvider>
      <DashboardContent {...props} />
    </NavProvider>
  );
}
