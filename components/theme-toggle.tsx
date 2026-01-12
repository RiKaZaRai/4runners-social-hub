'use client';

import { useEffect, useState } from 'react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ThemeMode = 'light' | 'dark' | 'night';

const THEMES: ThemeMode[] = ['light', 'dark', 'night'];

const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Clair',
  dark: 'Dark',
  night: 'Night'
};

const THEME_ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  night: Sparkles
};

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove('dark', 'night');
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'night') root.classList.add('night');
  root.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem('theme') as ThemeMode | null;
    const nextTheme = THEMES.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const Icon = THEME_ICONS[theme];

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => {
        const currentIndex = THEMES.indexOf(theme);
        const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem('theme', nextTheme);
      }}
    >
      <Icon className="h-4 w-4" />
      <span>{THEME_LABELS[theme]}</span>
    </Button>
  );
}
