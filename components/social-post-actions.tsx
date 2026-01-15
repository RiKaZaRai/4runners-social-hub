'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Toast } from '@/components/toast';

type Props = {
  spaceId: string;
  postId: string;
  status: string;
  isAgency: boolean;
  isClient: boolean;
};

const PENDING_STATUSES = new Set(['pending_client', 'changes_requested']);

export default function SocialPostActions({ spaceId, postId, status, isAgency, isClient }: Props) {
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const canSendForApproval = isAgency && ['draft', 'changes_requested'].includes(status);
  const canApprove = isClient && status === 'pending_client';
  const canRequestChanges = isClient && status === 'pending_client';

  const fetchCsrf = useCallback(() => {
    fetch('/api/csrf', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.token === 'string') {
          setCsrfToken(data.token);
        }
      })
      .catch((error) => {
        console.error('CSRF fetch failed', error);
      });
  }, []);

  useEffect(() => {
    fetchCsrf();
  }, [fetchCsrf]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastKey((prev) => prev + 1);
  };

  const dataMessage = (endpoint: string) => {
    if (endpoint === 'send-for-approval') return 'Post envoyé en validation';
    if (endpoint === 'approve') return 'Post approuvé';
    if (endpoint === 'request-changes') return 'Commentaire envoyé';
    return 'Action réussie';
  };

  const sendAction = async (endpoint: string, payload?: Record<string, unknown>) => {
    if (!csrfToken) {
      showToast('Jeton de sécurité manquant');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/spaces/${spaceId}/social/posts/${postId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          body: payload ? JSON.stringify(payload) : undefined,
          credentials: 'same-origin'
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(data.error ?? 'Action impossible');
      }
      showToast(dataMessage(endpoint));
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) {
      showToast('Merci de renseigner un commentaire');
      return;
    }
    await sendAction('request-changes', { comment: comment.trim() });
    setComment('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canSendForApproval && (
          <Button disabled={loading} onClick={() => sendAction('send-for-approval')}>
            {loading ? 'Envoi...' : 'Envoyer en validation'}
          </Button>
        )}
        {canApprove && (
          <Button variant="secondary" disabled={loading} onClick={() => sendAction('approve')}>
            {loading ? 'Validation...' : 'Approuver'}
          </Button>
        )}
      </div>
      {canRequestChanges && (
        <form onSubmit={handleRequestChanges} className="space-y-2">
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Demander une modification..."
            minLength={5}
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Envoi...' : 'Demander une modification'}
            </Button>
          </div>
        </form>
      )}

      {toastMessage && toastKey > 0 && (
        <Toast message={toastMessage} storageKey={`social-action-${postId}-${toastKey}`} />
      )}
    </div>
  );
}
