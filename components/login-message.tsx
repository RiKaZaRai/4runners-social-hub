'use client';

import { useSearchParams } from 'next/navigation';

export function LoginMessage() {
  const params = useSearchParams();
  const message = params.get('message');

  if (!message) return null;

  return (
    <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
      {message}
    </div>
  );
}
