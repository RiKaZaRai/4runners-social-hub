import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { DocTree } from '@/components/docs/doc-tree';
import { DocViewer } from '@/components/docs/doc-viewer';
import { VersionHistory } from '@/components/docs/version-history';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import {
  getFoldersAndDocuments,
  getDocument,
  getDocumentVersions
} from '@/lib/actions/documents';
import type { JSONContent } from '@tiptap/react';

export default async function WikiDocumentPage({
  params
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || !isAgencyRole(user.role)) {
    redirect('/spaces');
  }

  const [{ folders, documents }, doc, versions] = await Promise.all([
    getFoldersAndDocuments(null),
    getDocument(docId),
    getDocumentVersions(docId)
  ]);

  if (!doc || doc.tenantId !== null) {
    redirect('/wiki');
  }

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
            currentDocId={docId}
            basePath="/wiki"
          />
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto">
        <div className="border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VersionHistory versions={versions} currentDocId={docId} />
            </div>
            <Button asChild>
              <Link href={`/wiki/${docId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Link>
            </Button>
          </div>
        </div>
        <div className="p-6">
          <DocViewer content={doc.content as JSONContent} title={doc.title} />
        </div>
      </main>
    </div>
  );
}
