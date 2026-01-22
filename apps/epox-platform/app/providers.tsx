'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { getQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  // Use the singleton query client for consistent hydration
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(220 14% 10%)',
              border: '1px solid hsl(220 14% 18%)',
              color: 'hsl(40 15% 95%)',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
