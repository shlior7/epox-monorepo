// Reusable copy button component

'use client';

import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import { buildTestId } from '@/lib/utils/test-ids';
import styles from './CopyButton.module.scss';

interface CopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'button';
  testId?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  successMessage,
  className,
  size = 'medium',
  variant = 'icon',
  testId,
}) => {
  const { copy, isCopied } = useCopyToClipboard();

  const handleCopy = () => {
    copy(text, successMessage);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={`${styles.iconButton} ${styles[size]} ${className || ''}`}
        aria-label={label}
        title={label}
        data-testid={testId ?? buildTestId('copy-button', 'icon', label)}
      >
        {isCopied ? (
          <Check size={size === 'small' ? 14 : size === 'large' ? 20 : 16} />
        ) : (
          <Copy size={size === 'small' ? 14 : size === 'large' ? 20 : 16} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`${styles.button} ${styles[size]} ${className || ''}`}
      data-testid={testId ?? buildTestId('copy-button', 'text', label)}
    >
      {isCopied ? (
        <>
          <Check size={16} />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy size={16} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
