'use client';

import { useEffect } from 'react';
import { getLocalStorage, STORAGE_KEYS } from '@/lib/ui/localStore';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme from localStorage on mount
    const theme = getLocalStorage(STORAGE_KEYS.THEME, 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <html lang="en">
      <body>
        <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </body>
    </html>
  );
}