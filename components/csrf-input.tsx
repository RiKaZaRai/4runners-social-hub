// eslint-disable-next-line import/no-unresolved
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * CSRF Token Input Component
 *
 * Add this component to all forms that make state-changing requests (POST, PUT, PATCH, DELETE)
 *
 * Usage:
 * ```tsx
 * <form action="/api/posts" method="post">
 *   <CsrfInput />
 *   <input name="title" />
 *   <button type="submit">Submit</button>
 * </form>
 * ```
 */
export function CsrfInput({ showStatus = false }: { showStatus?: boolean }) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadToken = async () => {
      try {
        const response = await fetch('/api/csrf', { cache: 'no-store' });
        if (!response.ok) {
          if (isMounted) {
            setStatus('error');
          }
          return;
        }
        const data = await response.json();
        if (isMounted && typeof data.token === 'string') {
          setToken(data.token);
          setStatus('ready');
        } else if (isMounted) {
          setStatus('error');
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token', error);
        if (isMounted) {
          setStatus('error');
        }
      }
    };

    loadToken();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const form = inputRef.current?.closest('form');
    if (!form) return;

    const submitters = form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      'button[type="submit"], input[type="submit"]'
    );

    submitters.forEach((el) => {
      if (status !== 'ready') {
        if (el.dataset.csrfPrevDisabled === undefined) {
          el.dataset.csrfPrevDisabled = String(el.disabled);
        }
        el.disabled = true;
        el.setAttribute('aria-busy', 'true');
      } else {
        if (el.dataset.csrfPrevDisabled !== undefined) {
          el.disabled = el.dataset.csrfPrevDisabled === 'true';
          delete el.dataset.csrfPrevDisabled;
        }
        el.removeAttribute('aria-busy');
      }
    });
  }, [status]);

  return (
    <>
      <input ref={inputRef} type="hidden" name="csrf_token" value={token} />
      {showStatus && status !== 'ready' && (
        <p className="text-xs text-muted-foreground">
          {status === 'loading'
            ? 'Sécurisation en cours…'
            : 'Token de sécurité indisponible. Rafraîchissez la page.'}
        </p>
      )}
    </>
  );
}
