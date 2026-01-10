'use client';

/**
 * Home Page - Redirects to first client
 * Entry point of the application
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/contexts/DataContext';
import { WelcomeView } from '@/components/WelcomeView';

const styles = {
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};

export default function HomePage() {
  const { clients } = useData();

  // Show welcome view - no auto-redirect
  // User must explicitly select a client to proceed
  return (
    <div style={styles.mainContent}>
      <WelcomeView />
    </div>
  );
}
