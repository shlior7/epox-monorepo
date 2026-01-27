import clsx from 'clsx';
import { Check, Trash2 } from 'lucide-react';
import styles from '../../NavigationDrawer.module.scss';
import { buildTestId } from '@/lib/utils/test-ids';

type BulkBarMode = 'delete' | 'select';

interface BulkBarProps {
  mode: BulkBarMode;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function BulkBar({ mode, selectedCount, onConfirm, onCancel, confirmLabel }: BulkBarProps) {
  const icon = mode === 'delete' ? <Trash2 size={16} /> : <Check size={16} />;
  const buttonStyle = mode === 'delete' ? styles.actionButtonDanger : styles.actionButtonSuccess;
  const label = confirmLabel || (mode === 'delete' ? 'Delete' : 'Confirm');

  return (
    <div className={styles.multiSelectActions}>
      <button
        className={clsx(styles.actionButton, buttonStyle)}
        onClick={onConfirm}
        disabled={selectedCount === 0}
        type="button"
        data-testid={buildTestId('navigation-drawer', 'bulk-confirm', mode)}
      >
        {icon}
        {label} ({selectedCount} selected)
      </button>
      <button
        className={clsx(styles.actionButton, styles.actionButtonNeutral)}
        onClick={onCancel}
        type="button"
        data-testid={buildTestId('navigation-drawer', 'bulk-cancel')}
      >
        Cancel
      </button>
    </div>
  );
}
