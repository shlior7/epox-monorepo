import { forwardRef, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Ellipsis } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import styles from '../../NavigationDrawer.module.scss';
import { buildTestId } from '@/lib/utils/test-ids';

interface DrawerHeaderProps {
  title: string;
  canGoBack: boolean;
  onBack: () => void;
  rightActions?: (close: () => void) => ReactNode;
}

export const DrawerHeader = forwardRef<HTMLDivElement, DrawerHeaderProps>(({ title, canGoBack, onBack, rightActions }, ref) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    useMemo(() => [menuRef], []),
    useMemo(() => [() => setMenuOpen(false)], [])
  );

  return (
    <div className={styles.header} ref={ref}>
      <div className={styles.headerTitle}>
        {canGoBack && (
          <button
            className={styles.iconButton}
            onClick={onBack}
            aria-label="Go back"
            type="button"
            data-testid={buildTestId('navigation-drawer', 'back-button')}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {rightActions && (
        <div className={clsx(styles.headerActions, styles.actionMenuContainer)} ref={menuRef}>
          <button
            className={clsx(styles.iconButton, styles.actionMenuTrigger)}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Actions menu"
            aria-expanded={menuOpen}
            type="button"
            data-testid={buildTestId('navigation-drawer', 'actions-trigger')}
          >
            <Ellipsis size={20} />
          </button>
          {menuOpen && rightActions(() => setMenuOpen(false))}
        </div>
      )}
    </div>
  );
});

DrawerHeader.displayName = 'DrawerHeader';
