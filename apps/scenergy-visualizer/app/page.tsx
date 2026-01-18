'use client';

/**
 * Home Page - Redirects to first client
 * Entry point of the application
 */

import { WelcomeView } from '@/components/WelcomeView';

const styles = {
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};

export default function HomePage() {

  // Show welcome view - no auto-redirect
  // User must explicitly select a client to proceed
  return (
    <div style={styles.mainContent}>
      <WelcomeView />
    </div>
  );
}
