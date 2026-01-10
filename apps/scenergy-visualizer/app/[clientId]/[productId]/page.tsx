'use client';

/**
 * Product Page - Shows all sessions for a product
 * Route: /[clientId]/[productId]
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
  title: {
    fontSize: '32px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#e2e8f0',
  },
  description: {
    fontSize: '18px',
    color: '#94a3b8',
    maxWidth: '600px',
  },
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { clients, isLoading } = useData();

  const clientId = params.clientId as string;
  const productId = params.productId as string;

  // Get data
  const client = clients.find((c) => c.id === clientId);
  const product = client?.products.find((p) => p.id === productId);

  // Show 404 if not found AFTER loading completes
  useEffect(() => {
    if (!isLoading && (!client || !product)) {
      notFound();
    }
  }, [isLoading, client, product]);

  // Auto-navigate to product settings page
  useEffect(() => {
    if (!isLoading && product) {
      router.push(`/${clientId}/${productId}/settings`);
    }
  }, [isLoading, product, clientId, productId, router]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div style={styles.container}>
        <p style={styles.description}>Loading product...</p>
      </div>
    );
  }

  if (!client || !product) {
    return null; // Will redirect to 404
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{product.name}</h1>
      <p style={styles.description}>
        {product.sessions.length === 0
          ? 'No sessions yet. Create a new session from the navigation to get started.'
          : 'Redirecting to first session...'}
      </p>
    </div>
  );
}
