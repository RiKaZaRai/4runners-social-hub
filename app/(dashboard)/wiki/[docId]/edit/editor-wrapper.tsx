'use client';

import { useRouter } from 'next/navigation';
import { DocEditor } from '@/components/docs/doc-editor';
import { VersionHistory } from '@/components/docs/version-history';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';

interface Version {
  id: string;
  title: string;
  createdAt: string;
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
    // Use fetch API instead of Server Action to avoid serialization issues
    const response = await fetch(`/api/documents/${docId}/autosave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });

    if (!response.ok) {
      throw new Error('Failed to save document');
    }

    return response.json();
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
