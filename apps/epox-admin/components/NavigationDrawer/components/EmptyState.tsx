import { Plus } from 'lucide-react';
import styles from '../NavigationDrawer.module.scss';
import { buildTestId } from '@/lib/utils/test-ids';

interface EmptyStateProps {
  message: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function EmptyState({ message, onAdd, addLabel = 'Add' }: EmptyStateProps) {
  return (
    <div className={styles.emptyStateContainer}>
      <p className={styles.emptyStateMessage}>{message}</p>
      {onAdd && (
        <button onClick={onAdd} className={styles.emptyStateButton} data-testid={buildTestId('navigation-drawer', 'empty-add-button')}>
          <Plus size={14} />
          {addLabel}
        </button>
      )}
    </div>
  );
}
