'use client';

import { useRouter } from 'next/navigation';
import { DocEditor } from '@/components/docs/doc-editor';
import { VersionHistory } from '@/components/docs/version-history';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { updateDocument } from '@/lib/actions/documents';
import type { JSONContent } from '@tiptap/react';

interface Version {
  id: string;
  title: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface DocEditorWrapperProps {
  docId: string;
  initialContent: JSONContent;
  initialTitle: string;
  versions: Version[];
  basePath: string;
}

export function DocEditorWrapper({
  docId,
  initialContent,
  initialTitle,
  versions,
  basePath
}: DocEditorWrapperProps) {
  const router = useRouter();

  const handleSave = async (title: string, content: JSONContent) => {
    await updateDocument(docId, title, content);
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/${docId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <VersionHistory versions={versions} currentDocId={docId} />
      </div>
      <div className="flex-1 overflow-hidden">
        <DocEditor
          initialContent={initialContent}
          initialTitle={initialTitle}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
