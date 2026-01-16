import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { DocTree } from '@/components/docs/doc-tree';
import { DocEditorWrapper } from './editor-wrapper';
import {
  getFoldersAndDocuments,
  getDocument,
  getDocumentVersions
} from '@/lib/actions/documents';
import type { JSONContent } from '@tiptap/react';

export default async function WikiEditPage({
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

      {/* Editeur */}
      <main className="flex-1 overflow-hidden">
        <DocEditorWrapper
          docId={docId}
          initialContent={doc.content as JSONContent}
          initialTitle={doc.title}
          versions={versions}
          basePath="/wiki"
        />
      </main>
    </div>
  );
}
