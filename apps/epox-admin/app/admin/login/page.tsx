'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/styles/common-styles';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    background: `radial-gradient(circle at top, ${colors.slate[850]} 0%, ${colors.slate[950]} 50%, #050505 100%)`,
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: colors.slate[800],
    borderRadius: '16px',
    border: `1px solid ${colors.slate[700]}`,
    boxShadow: '0 25px 45px rgba(0, 0, 0, 0.45)',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: colors.slate[100],
  },
  brandIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[700]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    color: colors.slate[300],
    fontSize: '14px',
    margin: '6px 0 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    color: colors.slate[300],
    fontSize: '13px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: colors.slate[900],
    border: `1px solid ${colors.slate[600]}`,
    borderRadius: '10px',
    color: colors.slate[100],
    fontSize: '14px',
    outline: 'none',
  },
  helperRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: colors.slate[400],
    fontSize: '12px',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: `1px solid ${colors.red[600]}`,
    color: colors.red[300],
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: colors.indigo[600],
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  footer: {
    fontSize: '12px',
    color: colors.slate[400],
    textAlign: 'center' as const,
  },
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        if (response.ok) {
          router.replace('/');
          return;
        }
      } catch (error) {
        console.error('Failed to verify admin session:', error);
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setErrorMessage(payload?.error ?? 'Login failed. Please try again.');
        return;
      }

      router.replace('/');
    } catch (error) {
      console.error('Admin login failed:', error);
      setErrorMessage('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return <div style={styles.page} />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <ShieldCheck size={22} color={colors.indigo[300]} />
          </div>
          <div>
            <h1 style={styles.title}>Admin Access</h1>
            <p style={styles.subtitle}>Sign in to manage all client experiences.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="admin-email">
              Admin ID
            </label>
            <input
              id="admin-email"
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mega-admin"
              autoComplete="username"
              style={styles.input}
              onFocus={(event) => (event.currentTarget.style.borderColor = colors.indigo[500])}
              onBlur={(event) => (event.currentTarget.style.borderColor = colors.slate[600])}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={styles.input}
              onFocus={(event) => (event.currentTarget.style.borderColor = colors.indigo[500])}
              onBlur={(event) => (event.currentTarget.style.borderColor = colors.slate[600])}
            />
          </div>

          <div style={styles.helperRow}>
            <span>Admin-only access</span>
          </div>

          {errorMessage && <div style={styles.error}>{errorMessage}</div>}

          <button
            type="submit"
            style={styles.button}
            disabled={!canSubmit || isSubmitting}
            onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = colors.indigo[700])}
            onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = colors.indigo[600])}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>Epox Admin Console</div>
      </div>
    </div>
  );
}
