'use client';

import { ReactNode, useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AddProductModal, ConnectStoreModal } from '@/components/modals';
import { useModal } from '@/lib/hooks/use-modal';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

function AppShellContent({ children, className }: AppShellProps) {
  const { isOpen, closeModal } = useModal();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Global ambient background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Top gradient glow */}
        <div className="bg-primary/3 absolute left-1/4 top-0 h-[400px] w-[600px] rounded-full blur-[120px]" />
        <div className="bg-accent/2 absolute right-1/4 top-0 h-[300px] w-[400px] rounded-full blur-[100px]" />

        {/* Subtle pattern overlay */}
        <div className="pattern-dots absolute inset-0 opacity-30" />
      </div>

      {/* Sidebar */}
      <Sidebar setCollapsed={setSidebarCollapsed} collapsed={sidebarCollapsed} />

      {/* Main content area */}
      <main
        className={cn(
          'relative min-h-screen',
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-[60px]' : 'ml-64',
          className
        )}
      >
        {/* Content wrapper with max-width for readability */}
        <div className="relative">{children}</div>
      </main>

      {/* URL-based Modals */}
      <AddProductModal isOpen={isOpen('add-product')} onClose={closeModal} />
      <ConnectStoreModal isOpen={isOpen('connect-store')} onClose={closeModal} />
    </div>
  );
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <Suspense fallback={null}>
      <AppShellContent className={className}>{children}</AppShellContent>
    </Suspense>
  );
}
