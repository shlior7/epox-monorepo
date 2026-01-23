'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout';
import { Skeleton } from '@/components/ui/spinner';
import { apiClient } from '@/lib/api-client';
import { buildTestId } from '@/lib/testing/testid';
import { ConnectStoreWizard } from '@/components/store/ConnectStoreWizard';

function StorePageContent() {
  // Check store connection status
  const {
    data: connectionData,
    isLoading: isLoadingConnection,
    error: connectionError,
  } = useQuery({
    queryKey: ['store-connection-status'],
    queryFn: async () => {
      const response = await fetch('/api/store-connection/status');
      if (!response.ok) {
        throw new Error('Failed to fetch store connection status');
      }
      return response.json() as Promise<{
        connected: boolean;
        connection: {
          id: string;
          storeType: string;
          storeUrl: string;
          status: string;
        } | null;
      }>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isConnected = connectionData?.connected ?? false;

  // Loading state
  if (isLoadingConnection) {
    return (
      <div className="flex h-full flex-col" data-testid="store-page-loading">
        <PageHeader
          title="Store"
          description="Manage your store connection and sync assets"
          testId="store-header"
        />
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (connectionError) {
    return (
      <div className="flex h-full flex-col" data-testid="store-page-error">
        <PageHeader
          title="Store"
          description="Manage your store connection and sync assets"
          testId="store-header"
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load store connection status
            </p>
            <p className="mt-2 text-xs text-destructive">
              {connectionError instanceof Error ? connectionError.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - show wizard
  if (!isConnected) {
    return (
      <div className="flex h-full flex-col" data-testid="store-page-not-connected">
        <ConnectStoreWizard />
      </div>
    );
  }

  // Connected - show store page
  return (
    <div className="flex h-full flex-col" data-testid="store-page-connected">
      <PageHeader
        title="Store"
        description={`Connected to ${connectionData?.connection?.storeType ?? 'store'}`}
        testId="store-header"
      />

      {/* TODO: Implement store assets page */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Store assets page coming soon
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Connected to: {connectionData?.connection?.storeUrl}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StoreClient() {
  return (
    <div className="flex h-full flex-col" data-testid="store-page">
      <StorePageContent />
    </div>
  );
}
