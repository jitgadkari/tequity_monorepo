'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

function ThemeAwareToaster() {
  const { resolvedTheme } = useTheme();
  const background = resolvedTheme === 'dark' ? '#09090B' : '#FFFFFF';

  return (
    <Toaster
      position="top-right"
      expand
      toastOptions={{
        className: 'tequity-toast',
        style: {
          background,
          color: resolvedTheme === 'dark' ? '#FFFFFF' : '#09090B',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
      <ThemeAwareToaster />
    </ThemeProvider>
  );
}
