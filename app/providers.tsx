'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';
const THEMES: ThemeMode[] = ['light', 'dark'];

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const stored = window.localStorage.getItem('theme') as ThemeMode | null;
    const nextTheme = THEMES.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'dark';
    const root = document.documentElement;
    root.classList.remove('dark');
    if (nextTheme === 'dark') root.classList.add('dark');
    root.dataset.theme = nextTheme;
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
