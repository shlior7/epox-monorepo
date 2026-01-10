'use client';

/**
 * Client Page - Redirects to Settings Page
 * Route: /[clientId]
 * This route automatically redirects to the settings page
 */

import React, { useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useData } from '@/lib/contexts/DataContext';

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center' as const,
  },
  description: {
    fontSize: '18px',
    color: '#94a3b8',
    maxWidth: '600px',
  },
};

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const { clients, isLoading } = useData();

  const clientId = params.clientId as string;
  const client = clients.find((c) => c.id === clientId);

  // Show 404 if not found AFTER loading completes
  useEffect(() => {
    if (!isLoading && !client) {
      notFound();
    }
  }, [isLoading, client]);

  // Auto-redirect to settings page (main client page)
  useEffect(() => {
    if (!isLoading && client) {
      router.push(`/${clientId}/settings`);
    }
  }, [isLoading, client, clientId, router]);

  // Show loading state while redirecting
  return (
    <div style={styles.container}>
      <p style={styles.description}>Loading...</p>
    </div>
  );
}
