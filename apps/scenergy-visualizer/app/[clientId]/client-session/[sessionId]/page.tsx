'use client';

/**
 * Client Session Page - Scene Studio View
 * Route: /[clientId]/client-session/[sessionId]
 */

import React, { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useData } from '@/lib/contexts/DataContext';
import { SceneStudioView } from '@/components/SceneStudioView';
import { ImageModal } from '@/components/modals';

export default function ClientSessionPage() {
  const params = useParams();
  const { clients, isLoading } = useData();
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalImageId, setImageModalImageId] = useState<string | null>(null);

  const clientId = params.clientId as string;
  const sessionId = params.sessionId as string;

  // Get fresh data from context
  const client = clients.find((c) => c.id === clientId);
  const clientSession = client?.clientSessions?.find((s) => s.id === sessionId);

  // Debug logging
  useEffect(() => {
    console.log('ClientSessionPage state:', {
      isLoading,
      clientsCount: clients.length,
      hasClient: !!client,
      hasClientSession: !!clientSession,
      flowsCount: clientSession?.flows?.length || 0,
      clientId,
      sessionId,
    });
  }, [isLoading, clients.length, client, clientSession, clientId, sessionId]);

  // Show 404 if data not found AFTER loading completes
  useEffect(() => {
    if (!isLoading && (!client || !clientSession)) {
      console.log('⚠️ Calling notFound() - data not found after loading');
      notFound();
    }
  }, [isLoading, client, clientSession]);

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

  if (!client || !clientSession) {
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
    <div className="session-view" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <SceneStudioView clientId={clientId} clientSession={clientSession} products={client.products} onImageClick={handleImageClick} />
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
