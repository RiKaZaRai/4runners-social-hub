import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { DocTree } from '@/components/docs/doc-tree';
import { getFoldersAndDocuments } from '@/lib/actions/documents';

export default async function WikiPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || !isAgencyRole(user.role)) {
    redirect('/spaces');
  }

  const { folders, documents } = await getFoldersAndDocuments(null);

  return (
    <div className="flex h-full">
      {/* Sidebar arborescence */}
      <aside className="w-64 shrink-0 border-r bg-muted/30">
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Wiki</h2>
          <DocTree
            tenantId={null}
            folders={folders}
            documents={documents}
            basePath="/wiki"
          />
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-6">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">
            Selectionnez un document ou creez-en un nouveau.
          </p>
        </div>
      </main>
    </div>
  );
}
