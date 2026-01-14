import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: '4runners Social Hub',
  description: 'Agency social content hub'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const themeInitScript = `
    (function () {
      try {
        const stored = window.localStorage.getItem('theme');
        const theme = stored === 'dark' || stored === 'light' ? stored : 'dark';
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.theme = theme;
      } catch (e) {
        // fail silently
      }
    })();
  `;

  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
