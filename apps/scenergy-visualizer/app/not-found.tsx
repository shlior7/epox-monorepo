'use client';

/**
 * Custom 404 Not Found Page
 */

import Link from 'next/link';

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
    fontSize: '72px',
    fontWeight: 700,
    marginBottom: '16px',
    color: '#6366f1',
  },
  subtitle: {
    fontSize: '32px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#e2e8f0',
  },
  description: {
    fontSize: '18px',
    color: '#94a3b8',
    maxWidth: '600px',
    marginBottom: '32px',
  },
  link: {
    padding: '12px 24px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
};

export default function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>404</h1>
      <h2 style={styles.subtitle}>Page Not Found</h2>
      <p style={styles.description}>The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/" style={styles.link}>
        Go Home
      </Link>
    </div>
  );
}
