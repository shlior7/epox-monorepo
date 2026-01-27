// Reusable EmptyState component for better UX guidance

'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, secondaryAction, className }) => {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.iconWrapper}>
        <Icon className={styles.icon} size={48} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {(action || secondaryAction) && (
        <div className={styles.actions}>
          {action && (
            <button
              onClick={action.onClick}
              className={`${styles.button} ${styles[action.variant || 'primary']}`}
              data-testid={buildTestId('empty-state', title, 'primary-action')}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={`${styles.button} ${styles.secondary}`}
              data-testid={buildTestId('empty-state', title, 'secondary-action')}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
