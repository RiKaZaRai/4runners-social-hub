import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { getDocument, getFoldersAndDocuments } from '@/lib/actions/documents';
import { DocViewerPage } from '@/components/docs/doc-viewer-page';
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

  const [doc, { folders }] = await Promise.all([
    getDocument(docId),
    getFoldersAndDocuments(null)
  ]);

  if (!doc || doc.tenantId !== null) {
    redirect('/wiki');
  }

  // Build breadcrumb
  const breadcrumb: { label: string; href?: string }[] = [
    { label: 'Wiki', href: '/wiki' }
  ];

  // If doc has a folder, find the section
  if (doc.folderId) {
    const folder = folders.find((f) => f.id === doc.folderId);
    if (folder) {
      // Extract section from folder name
      const sectionMatch = folder.name.match(/^\[([^\]]+)\]/);
      if (sectionMatch) {
        breadcrumb.push({ label: sectionMatch[1].replace(/-/g, ' ') });
      }
      // Add folder name (without prefix)
      const folderName = folder.name.replace(/^\[.*?\]\s*/, '');
      breadcrumb.push({ label: folderName });
    }
  }

  return (
    <DocViewerPage
      docId={docId}
      title={doc.title}
      content={doc.content as JSONContent}
      updatedAt={doc.updatedAt.toISOString()}
      createdBy={doc.createdBy}
      breadcrumb={breadcrumb}
      basePath="/wiki"
    />
  );
}
