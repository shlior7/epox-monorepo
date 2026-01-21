'use client';

/**
 * ThemeToggle - Toggle button for switching between light and dark themes
 * Displays sun icon for light mode, moon icon for dark mode
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme, useThemeMounted } from '@/lib/contexts/ThemeContext';
import styles from './ThemeToggle.module.scss';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const mounted = useThemeMounted();

  const iconSize = {
    sm: 14,
    md: 18,
    lg: 22,
  }[size];

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <button className={`${styles.toggle} ${styles[size]} ${className || ''}`} aria-label="Toggle theme" disabled>
        <span className={styles.iconPlaceholder} style={{ width: iconSize, height: iconSize }} />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      className={`${styles.toggle} ${styles[size]} ${isDark ? styles.dark : styles.light} ${className || ''}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className={styles.iconWrapper}>
        <Sun size={iconSize} className={`${styles.icon} ${styles.sunIcon} ${!isDark ? styles.active : ''}`} />
        <Moon size={iconSize} className={`${styles.icon} ${styles.moonIcon} ${isDark ? styles.active : ''}`} />
      </span>
    </button>
  );
}
