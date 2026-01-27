'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, AlertTriangle, LogOut, ShieldCheck } from 'lucide-react';
import type { AdminAuthSession } from '@/lib/auth/admin-auth';

interface AdminNavProps {
  adminSession: AdminAuthSession;
}

const navItems = [
  { href: '/admin/dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clients' as const, label: 'Clients', icon: Users },
  { href: '/admin/analytics' as const, label: 'Analytics', icon: BarChart3 },
  { href: '/admin/alerts' as const, label: 'Alerts', icon: AlertTriangle },
] as const;

export function AdminNav({ adminSession }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="admin-nav" data-testid="admin-nav">
      <div className="admin-nav__header">
        <div className="admin-nav__brand">
          <div className="admin-nav__brand-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="admin-nav__brand-title">Epox Admin</h1>
            <p className="admin-nav__brand-subtitle">Platform Management</p>
          </div>
        </div>
      </div>

      <div className="admin-nav__links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
              data-testid={`admin-nav-link-${item.label.toLowerCase()}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="admin-nav__footer">
        <div className="admin-nav__user">
          <div className="admin-nav__user-avatar">{adminSession.name.charAt(0).toUpperCase()}</div>
          <div className="admin-nav__user-info">
            <p className="admin-nav__user-name">{adminSession.name}</p>
            <p className="admin-nav__user-email">{adminSession.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="admin-nav__logout"
          data-testid="admin-logout-button"
        >
          <LogOut size={18} />
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </nav>
  );
}
