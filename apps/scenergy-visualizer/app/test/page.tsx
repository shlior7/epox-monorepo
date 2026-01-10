'use client';

/**
 * Test Page - For development testing
 */

import { useState } from 'react';
import Link from 'next/link';

const styles = {
  container: {
    flex: 1,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 500,
    width: 'fit-content',
  },
  link: {
    padding: '12px 24px',
    backgroundColor: '#64748b',
    color: '#ffffff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    width: 'fit-content',
  },
};

export default function TestPage() {
  const [test, setTest] = useState('Hello World');

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Test Page</h1>
      <p>{test}</p>
      <button style={styles.button} onClick={() => setTest('Updated!')}>
        Update
      </button>
      <Link href="/" style={styles.link}>
        Back to Home
      </Link>
    </div>
  );
}
