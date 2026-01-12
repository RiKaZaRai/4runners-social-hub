'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const data = await res.json();
  return data.token as string;
}

async function createIdea(tenantId: string, title: string, description: string) {
  const csrfToken = await fetchCsrfToken();
  const formData = new FormData();
  formData.set('tenantId', tenantId);
  formData.set('title', title);
  formData.set('description', description);

  const res = await fetch('/api/ideas', {
    method: 'POST',
    body: formData,
    headers: {
      'x-csrf-token': csrfToken
    },
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('Failed to create idea');
  }
}

export default function IdeaCreateClient({ tenantId }: { tenantId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createIdea(tenantId, title, description),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['ideas', tenantId] });
    }
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre" required />
      <Textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description"
      />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creation...' : 'Ajouter'}
      </Button>
    </form>
  );
}
