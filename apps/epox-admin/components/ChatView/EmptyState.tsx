// components/ChatView/EmptyState.tsx
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import scssStyles from './ChatView.module.scss';

export function EmptyState() {
  return (
    <div className={scssStyles.emptyState}>
      <div className={scssStyles.emptyContent}>
        <div className={scssStyles.emptyIcon}>
          <ImageIcon style={{ width: '32px', height: '32px', color: '#6366f1' }} />
        </div>
        <h3 className={scssStyles.emptyTitle}>Start Generating</h3>
        <p className={scssStyles.emptyText}>
          Configure your prompt settings in the right panel and add instructions to generate stunning product visuals.
        </p>
      </div>
    </div>
  );
}
