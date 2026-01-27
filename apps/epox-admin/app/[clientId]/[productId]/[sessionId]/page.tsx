'use client';

/**
 * Session Page - Chat view for a specific session
 * Route: /[clientId]/[productId]/[sessionId]
 */

import React, { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useData } from '@/lib/contexts/DataContext';
import { ChatView } from '@/components/ChatView/ChatView';
import { ImageModal } from '@/components/modals';

export default function SessionPage() {
  const params = useParams();
  const { clients, isLoading } = useData();
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalImageId, setImageModalImageId] = useState<string | null>(null);

  const clientId = params.clientId as string;
  const productId = params.productId as string;
  const sessionId = params.sessionId as string;

  // Get fresh data from context
  const client = clients.find((c) => c.id === clientId);
  const product = client?.products.find((p) => p.id === productId);
  const session = product?.sessions.find((s) => s.id === sessionId);

  // Debug logging
  useEffect(() => {
    console.log('SessionPage state:', {
      isLoading,
      clientsCount: clients.length,
      hasClient: !!client,
      hasProduct: !!product,
      hasSession: !!session,
      clientId,
      productId,
      sessionId,
    });
  }, [isLoading, clients.length, client, product, session, clientId, productId, sessionId]);

  // Show 404 if data not found AFTER loading completes
  useEffect(() => {
    if (!isLoading && (!client || !product || !session)) {
      console.log('⚠️ Calling notFound() - data not found after loading');
      notFound();
    }
  }, [isLoading, client, product, session]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 0,
          padding: '24px',
        }}
      >
        <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>Loading session...</span>
      </div>
    );
  }

  if (!client || !product || !session) {
    return null; // Will redirect to 404
  }

  const handleImageClick = (imageUrl: string) => {
    // Extract imageId from the URL (format: .../media/{imageId})
    const urlParts = imageUrl.split('/');
    const imageId = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any

    setImageModalUrl(imageUrl);
    setImageModalImageId(imageId);
  };

  return (
    <div className="session-view" style={{ flex: 1, display: 'flex', overflow: 'hidden' }} data-testid="session-page">
      <ChatView
        clientId={clientId}
        productId={productId}
        sessionId={sessionId}
        product={product}
        session={session}
        onImageClick={handleImageClick}
      />
      <ImageModal
        isOpen={imageModalUrl !== null}
        imageUrl={imageModalUrl}
        onClose={() => {
          setImageModalUrl(null);
          setImageModalImageId(null);
        }}
      />
    </div>
  );
}
