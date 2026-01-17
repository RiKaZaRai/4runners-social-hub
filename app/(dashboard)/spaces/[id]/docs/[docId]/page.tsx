import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole, isClientRole } from '@/lib/roles';
import { hasModule } from '@/lib/modules.server';
import { DocViewer } from '@/components/docs/doc-viewer';
import { getDocument } from '@/lib/actions/documents';

// Use local type instead of @tiptap/react to avoid client module in server component
type JSONContent = Record<string, unknown>;

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

  // Vérifier accès client
  if (isClient) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: spaceId, userId: session.userId } }
    });
    if (!membership) {
      redirect('/spaces');
    }
  }

  // Agence: rediriger vers l'éditeur directement
  if (isAgency) {
    redirect(`/spaces/${spaceId}/docs/${docId}/edit`);
  }

  const doc = await getDocument(docId);

  if (!doc || doc.tenantId !== spaceId) {
    redirect(`/spaces/${spaceId}/docs`);
  }

  // Client ne peut voir que les documents publics
  if (!doc.isPublic) {
    redirect(`/spaces/${spaceId}/docs`);
  }

  // Vue client simplifiée (lecture seule)
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
