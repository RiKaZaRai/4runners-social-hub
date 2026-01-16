import { notFound } from 'next/navigation';
import { getPublicDocument } from '@/lib/actions/documents';
import { DocViewer } from '@/components/docs/doc-viewer';
import type { JSONContent } from '@tiptap/react';

export default async function PublicDocumentPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const doc = await getPublicDocument(token);

  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <p className="text-sm text-muted-foreground">Document partage</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <DocViewer content={doc.content as JSONContent} title={doc.title} />
        <footer className="mt-8 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Derniere mise a jour :{' '}
            {new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).format(new Date(doc.updatedAt))}
          </p>
        </footer>
      </main>
    </div>
  );
}
