'use client';

import { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  storageKey: string;
  dismissMs?: number;
  throttleMs?: number;
}

export function Toast({
  message,
  storageKey,
  dismissMs = 3500,
  throttleMs = 4000
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const raw = sessionStorage.getItem(storageKey);
    const lastShown = raw ? Number(raw) : 0;

    if (!Number.isNaN(lastShown) && now - lastShown < throttleMs) {
      return;
    }

    sessionStorage.setItem(storageKey, String(now));
    setVisible(true);

    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, dismissMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dismissMs, storageKey, throttleMs]);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-[320px] rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
