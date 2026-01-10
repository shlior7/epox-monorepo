// Breadcrumb navigation component

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumb.module.scss';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, showHome = true, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={`${styles.breadcrumb} ${className || ''}`}>
      <ol className={styles.list}>
        {showHome && (
          <>
            <li className={styles.item}>
              <Link href="/" className={styles.link}>
                <Home size={16} />
                <span className={styles.homeLabel}>Home</span>
              </Link>
            </li>
            {items.length > 0 && (
              <li className={styles.separator} aria-hidden="true">
                <ChevronRight size={16} />
              </li>
            )}
          </>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <li className={styles.item}>
                {item.href ? (
                  <Link href={item.href as any} className={styles.link}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={`${styles.text} ${isLast ? styles.current : ''}`} aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li className={styles.separator} aria-hidden="true">
                  <ChevronRight size={16} />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
