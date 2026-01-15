'use client';

import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/toast';

type MessageAuthor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
};

type SpaceMessage = {
  id: string;
  body: string;
  authorRole: 'agency' | 'client';
  createdAt: string;
  author: MessageAuthor;
};

const ROLE_LABELS: Record<SpaceMessage['authorRole'], string> = {
  agency: 'Agence',
  client: 'Client'
};

function formatAuthor(author: MessageAuthor) {
  const fullName = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  return fullName || author.name || author.email || 'Utilisateur';
}

async function fetchMessages(spaceId: string) {
  const response = await fetch(`/api/spaces/${spaceId}/messages`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }
  return (await response.json()) as SpaceMessage[];
}

async function fetchCsrfToken() {
  const response = await fetch('/api/csrf', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('CSRF_FAILED');
  }
  const data = await response.json();
  if (typeof data.token !== 'string') {
    throw new Error('CSRF_FAILED');
  }
  return data.token as string;
}

export function SpaceMessages({ spaceId }: { spaceId: string }) {
  const [draft, setDraft] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [toastNonce, setToastNonce] = useState(0);
  const initialScrollDone = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messagesQuery = useQuery({
    queryKey: ['space-messages', spaceId],
    queryFn: () => fetchMessages(spaceId),
    refetchInterval: 15000
  });

  useEffect(() => {
    if (messagesQuery.error instanceof Error && messagesQuery.error.message === 'HTTP_403') {
      setToastNonce((prev) => prev + 1);
    }
  }, [messagesQuery.error]);

  useEffect(() => {
    if (messagesQuery.data && !initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      initialScrollDone.current = true;
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    fetchCsrfToken()
      .then(setCsrfToken)
      .catch(() => undefined);
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const token = csrfToken ?? (await fetchCsrfToken());
      if (!csrfToken) {
        setCsrfToken(token);
      }

      const response = await fetch(`/api/spaces/${spaceId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ body })
      });

      if (!response.ok) {
        if (response.status === 403) {
          setToastNonce((prev) => prev + 1);
        }
        throw new Error(`HTTP_${response.status}`);
      }

      return response.json() as Promise<SpaceMessage>;
    },
    onSuccess: () => {
      setDraft('');
      messagesQuery.refetch().then(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  });

  const messages = messagesQuery.data ?? [];
  const isSending = sendMutation.isPending;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-4">
      {toastNonce > 0 && (
        <Toast
          key={toastNonce}
          message="Acces refuse. Vous n'avez pas les droits pour envoyer un message."
          storageKey="toast:space-messages:forbidden"
        />
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {messagesQuery.isFetching ? 'Synchronisation...' : 'Derniere mise a jour'}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => messagesQuery.refetch()}
          disabled={messagesQuery.isFetching}
        >
          Rafraichir
        </Button>
      </div>

      <div className="flex h-[65vh] flex-col rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun message pour le moment.</div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatAuthor(message.author)}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {ROLE_LABELS[message.authorRole]}
                    </Badge>
                    <span>
                      {new Date(message.createdAt).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                    {message.body}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ecrire un message..."
              rows={3}
              className="min-h-[90px]"
            />
            <Button type="submit" disabled={isSending || !draft.trim()}>
              {isSending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
