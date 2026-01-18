'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-center gap-3 p-4 rounded-lg border shadow-lg bg-card text-card-foreground',
          title: 'font-medium',
          description: 'text-sm text-muted-foreground',
          success: 'border-green-500/20 bg-green-500/10',
          error: 'border-red-500/20 bg-red-500/10',
          info: 'border-blue-500/20 bg-blue-500/10',
          warning: 'border-yellow-500/20 bg-yellow-500/10',
        },
      }}
    />
  );
}

// Re-export toast function from sonner
export { toast } from 'sonner';
