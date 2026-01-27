'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './DangerZone.module.scss';

interface DangerZoneProps {
  /**
   * The title of the danger zone section
   */
  title: string;
  /**
   * Descriptive text explaining what will happen on deletion
   */
  description: string;
  /**
   * The label for the delete button
   */
  buttonLabel: string;
  /**
   * Callback function triggered when delete button is clicked
   */
  onDelete: () => void;
  /**
   * Optional aria-label for accessibility
   */
  ariaLabel?: string;
}

/**
 * DangerZone Component
 *
 * A reusable component for displaying destructive actions with clear warnings.
 * Used on both client and product settings pages for deletion functionality.
 */
export function DangerZone({ title, description, buttonLabel, onDelete, ariaLabel }: DangerZoneProps) {
  return (
    <section className={styles.dangerZone}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <button
        type="button"
        onClick={onDelete}
        className={styles.deleteButton}
        aria-label={ariaLabel || buttonLabel}
        data-testid={buildTestId('danger-zone', ariaLabel, 'delete')}
      >
        <Trash2 size={18} />
        <span>{buttonLabel}</span>
      </button>
    </section>
  );
}
