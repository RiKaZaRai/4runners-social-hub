import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import { hasModule } from '@/lib/modules.server';
import { DocTree } from '@/components/docs/doc-tree';
import { DocViewer } from '@/components/docs/doc-viewer';
import { VersionHistory } from '@/components/docs/version-history';
import { ShareToggle } from '@/components/docs/share-toggle';
import { Button } from '@/components/ui/button';
import { Pencil, Bell } from 'lucide-react';
import {
  getFoldersAndDocuments,
  getDocument,
  getDocumentVersions
} from '@/lib/actions/documents';
import { NotifyButton } from './notify-button';
import type { JSONContent } from '@tiptap/react';

export default async function SpaceDocumentPage({
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

  // Module gating
  const moduleEnabled = await hasModule(spaceId, 'docs');
  if (!moduleEnabled) {
    redirect(`/spaces/${spaceId}/overview`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: spaceId },
    select: { name: true }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  const isAgency = isAgencyRole(user.role);
  const isClient = isClientRole(user.role);

  // Vérifier accès
  if (isClient) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: spaceId, userId: session.userId } }
    });
    if (!membership) {
      redirect('/spaces');
    }
  }

  const doc = await getDocument(docId);

  if (!doc || doc.tenantId !== spaceId) {
    redirect(`/spaces/${spaceId}/docs`);
  }

  // Client ne peut voir que les documents publics
  if (isClient && !doc.isPublic) {
    redirect(`/spaces/${spaceId}/docs`);
  }

  // Agence: rediriger vers l'éditeur directement
  if (isAgency) {
    redirect(`/spaces/${spaceId}/docs/${docId}/edit`);
  }

  // Pour l'agence: récupérer arborescence et versions
  let folders: Awaited<ReturnType<typeof getFoldersAndDocuments>>['folders'] = [];
  let documents: Awaited<ReturnType<typeof getFoldersAndDocuments>>['documents'] = [];
  let versions: Awaited<ReturnType<typeof getDocumentVersions>> = [];

  if (isAgency) {
    const [data, v] = await Promise.all([
      getFoldersAndDocuments(spaceId),
      getDocumentVersions(docId)
    ]);
    folders = data.folders;
    documents = data.documents;
    versions = v;
  }

  // Vue client simplifiée
  if (isClient) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        </header>
        <div className="rounded-md border p-6">
          <DocViewer content={doc.content as JSONContent} title={doc.title} />
        </div>
      </div>
    );
  }

  // Vue agence complète
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

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto">
        <div className="border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VersionHistory versions={versions} currentDocId={docId} />
              <ShareToggle
                docId={docId}
                isPublic={doc.isPublic}
                publicToken={doc.publicToken}
              />
              <NotifyButton docId={docId} />
            </div>
            <Button asChild>
              <Link href={`/spaces/${spaceId}/docs/${docId}/edit`}>
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
