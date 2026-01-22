'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Wand2,
  Images,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/contexts/auth-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Studio', href: '/studio', icon: Wand2 },
  { name: 'Collections', href: '/collections', icon: FolderKanban },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Assets', href: '/assets', icon: Images },
];

export function Sidebar({
  setCollapsed,
  collapsed,
}: {
  setCollapsed: (collapsed: boolean) => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Prevent hydration mismatch by using consistent fallback until mounted
  const userName = mounted ? user?.name || 'User' : 'User';
  const userEmail = mounted ? user?.email || '' : '';
  const userInitials = getInitials(userName);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen',
        'flex flex-col',
        'bg-charcoal-900/95 backdrop-blur-xl',
        'border-r border-border/50',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-[60px]' : 'w-64'
      )}
    >
      {/* Ambient glow effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="bg-accent/3 absolute -left-12 top-1/2 h-64 w-24 rounded-full blur-2xl" />
      </div>

      {/* Logo Section */}
      <div
        className={cn(
          'relative flex h-14 items-center justify-between px-3',
          'border-b border-border/50'
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5',
            'transition-all duration-300',
            collapsed && 'justify-center'
          )}
        >
          <div className="relative h-8 w-8">
            <Image
              src="/media/logo-white.png"
              alt="Epox Logo"
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
          </div>
          {!collapsed && (
            <span className="text-gradient font-display text-lg font-semibold tracking-tight">
              EPOX
            </span>
          )}
        </Link>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            'h-6 w-6 transition-all duration-200',
            collapsed &&
              'absolute -right-3 border border-border bg-transparent hover:bg-charcoal-700'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setCollapsed(false)}
              className={cn(
                'relative flex items-center gap-2.5',
                'rounded-lg px-2.5 py-2',
                'text-sm font-medium',
                'transition-all duration-200',
                collapsed && 'justify-center px-2',
                isActive
                  ? [
                      'bg-primary/15 text-primary',
                      'border border-primary/25',
                      'shadow-sm shadow-primary/10',
                    ]
                  : [
                      'text-muted-foreground',
                      'hover:bg-secondary/50 hover:text-foreground',
                      'border border-transparent',
                    ]
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  className={cn(
                    'absolute left-0',
                    'h-5 w-0.5 rounded-r-full',
                    'bg-gradient-to-b from-primary to-accent'
                  )}
                />
              )}

              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Quick Action */}
      {!collapsed && <div className="px-2 pb-3"></div>}

      {/* User Section */}
      <div className="relative border-t border-border/50 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5',
                'rounded-lg p-2',
                'text-left',
                'transition-all duration-200',
                'hover:bg-secondary/50',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="h-8 w-8 ring-2 ring-border/50">
                <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{userEmail}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? 'center' : 'end'} side="top" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
