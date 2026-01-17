'use client';

import { useRef, useEffect } from 'react';
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
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const handleSave = async (title: string, content: JSONContent) => {
    // Abort any in-flight request (latest wins)
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const response = await fetch(`/api/documents/${docId}/autosave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
      signal: abortRef.current.signal
    });

    if (!response.ok) {
      let message = 'Erreur de sauvegarde';
      try {
        const data = await response.json();
        if (typeof data?.error === 'string') message = data.error;
      } catch {
        // Keep default message
      }
      throw new Error(message);
    }

    const data = (await response.json()) as {
      ok: boolean;
      skipped: boolean;
      updatedAt: string;
    };
    return data;
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
