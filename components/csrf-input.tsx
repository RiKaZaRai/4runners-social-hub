// eslint-disable-next-line import/no-unresolved
'use client';

import { useEffect, useState } from 'react';

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
export function CsrfInput() {
  const [token, setToken] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadToken = async () => {
      try {
        const response = await fetch('/api/csrf', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted && typeof data.token === 'string') {
          setToken(data.token);
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token', error);
      }
    };

    loadToken();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <input
      type="hidden"
      name="csrf_token"
      value={token}
    />
  );
}
