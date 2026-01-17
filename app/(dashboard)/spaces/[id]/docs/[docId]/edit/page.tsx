import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { hasModule } from '@/lib/modules.server';
import { DocTree } from '@/components/docs/doc-tree';
import { DocEditorWrapper } from './editor-wrapper';
import {
  getFoldersAndDocuments,
  getDocument,
  getDocumentVersions
} from '@/lib/actions/documents';

// Use local type instead of @tiptap/react to avoid client module in server component
type JSONContent = Record<string, unknown>;

export default async function SpaceDocEditPage({
  params
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: spaceId, docId } = await params;
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user) {
    redirect('/login');
  }

  // Seule l'agence peut éditer
  if (!isAgencyRole(user.role)) {
    redirect(`/spaces/${spaceId}/docs/${docId}`);
  }

  // Module gating
  const moduleEnabled = await hasModule(spaceId, 'docs');
  if (!moduleEnabled) {
    redirect(`/spaces/${spaceId}/overview`);
  }

  const [{ folders, documents }, doc, versions] = await Promise.all([
    getFoldersAndDocuments(spaceId),
    getDocument(docId),
    getDocumentVersions(docId)
  ]);

  if (!doc || doc.tenantId !== spaceId) {
    redirect(`/spaces/${spaceId}/docs`);
  }

  // Serialize dates for client component
  const serializedVersions = versions.map((v: { id: string; title: string; createdAt: Date; createdBy: { id: string; name: string | null; email: string } | null }) => ({
    ...v,
    createdAt: v.createdAt.toISOString()
  }));

  return (
    <div className="flex h-full">
      {/* Sidebar arborescence */}
      <aside className="w-64 shrink-0 border-r bg-muted/30">
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Documents</h2>
          <DocTree
            tenantId={spaceId}
            folders={folders}
            documents={documents}
            currentDocId={docId}
            basePath={`/spaces/${spaceId}/docs`}
          />
        </div>
      </aside>

      {/* Editeur */}
      <main className="flex-1 overflow-hidden">
        <DocEditorWrapper
          docId={docId}
          initialContent={doc.content as JSONContent}
          initialTitle={doc.title}
          versions={serializedVersions}
          basePath={`/spaces/${spaceId}/docs`}
        />
      </main>
    </div>
  );
}
