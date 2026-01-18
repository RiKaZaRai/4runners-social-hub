import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { getFoldersAndDocumentsFull } from '@/lib/actions/documents';
import { WikiStructured } from '@/components/wiki';

export default async function WikiDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || !isAgencyRole(user.role)) {
    redirect('/spaces');
  }

  // Verify document exists
  const document = await prisma.wikiDocument.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!document) {
    redirect('/wiki');
  }

  const { folders, documents } = await getFoldersAndDocumentsFull(null);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <WikiStructured
        folders={folders}
        documents={documents}
        basePath="/wiki"
        initialDocId={id}
      />
    </div>
  );
}
