import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { getDocument } from '@/lib/actions/documents';

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

  const doc = await getDocument(docId);

  if (!doc || doc.tenantId !== null) {
    redirect('/wiki');
  }

  // Rediriger vers l'éditeur directement
  redirect(`/wiki/${docId}/edit`);
}
