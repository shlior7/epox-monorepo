'use client';

/**
 * ActionsMenu - Reusable three-dot dropdown menu component
 * Provides a consistent UI pattern for actions across the app
 */

import React, { useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './ActionsMenu.module.scss';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionsMenuProps {
  items: ActionMenuItem[];
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  ariaLabel?: string;
}

export function ActionsMenu({ items, isOpen, onToggle, onClose, ariaLabel = 'More options' }: ActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        onClick={onToggle}
        className={styles.trigger}
        aria-label={ariaLabel}
        data-testid={buildTestId('actions-menu', 'trigger')}
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {items.map((item, index) => (
            <button
              key={index}
              onClick={(e) => {
                if (!item.disabled) {
                  item.onClick(e);
                  onClose();
                }
              }}
              disabled={item.disabled}
              className={clsx(styles.menuItem, item.variant === 'danger' && styles.menuItemDanger)}
              data-testid={buildTestId('actions-menu', item.label)}
            >
              {item.icon && <span className={styles.iconSlot}>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
