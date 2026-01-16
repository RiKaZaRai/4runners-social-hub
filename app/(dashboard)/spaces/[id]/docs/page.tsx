import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import { hasModule } from '@/lib/modules.server';
import { DocTree } from '@/components/docs/doc-tree';
import { getFoldersAndDocuments } from '@/lib/actions/documents';

export default async function SpaceDocsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: spaceId } = await params;
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
    select: { name: true, active: true }
  });

  if (!tenant) {
    redirect('/spaces');
  }

  const isAgency = isAgencyRole(user.role);
  const isClient = isClientRole(user.role);

  // Client: vérifier membership
  if (isClient) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: spaceId, userId: session.userId } }
    });
    if (!membership) {
      redirect('/spaces');
    }
  }

  // Clients ne peuvent que voir les documents publics
  // Pour l'instant on affiche l'arborescence uniquement pour l'agence
  if (isClient) {
    // Récupérer uniquement les documents partagés pour le client
    const sharedDocs = await prisma.document.findMany({
      where: {
        tenantId: spaceId,
        isPublic: true
      },
      select: {
        id: true,
        title: true,
        folderId: true,
        updatedAt: true
      },
      orderBy: { title: 'asc' }
    });

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        </header>

        {sharedDocs.length === 0 ? (
          <p className="text-muted-foreground">Aucun document partage pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {sharedDocs.map((doc) => (
              <a
                key={doc.id}
                href={`/spaces/${spaceId}/docs/${doc.id}`}
                className="block rounded-md border p-3 hover:bg-muted"
              >
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  Mis a jour le{' '}
                  {new Intl.DateTimeFormat('fr-FR').format(new Date(doc.updatedAt))}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Agence: vue complète avec arborescence
  const { folders, documents } = await getFoldersAndDocuments(spaceId);

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
            basePath={`/spaces/${spaceId}/docs`}
          />
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-6">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        </div>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">
            Selectionnez un document ou creez-en un nouveau.
          </p>
        </div>
      </main>
    </div>
  );
}
