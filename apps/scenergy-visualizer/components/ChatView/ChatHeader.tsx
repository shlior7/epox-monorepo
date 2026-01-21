// components/ChatView/ChatHeader.tsx
import React from 'react';
import { Hammer, Star, Download, Check, X } from 'lucide-react';
import { buildTestId } from '@/lib/utils/test-ids';
import scssStyles from './ChatView.module.scss';

interface ChatHeaderProps {
  sessionName?: string;
  productInfo: string;
  isMultiSelectMode: boolean;
  selectedImagesCount: number;
  onStartMultiSelect: (action: 'favorite' | 'download') => void;
  onCancelMultiSelect: () => void;
  onApplyMultiSelect: () => void;
  onSelectAll: () => void;
  onOpenPromptBuilder: () => void;
}

export function ChatHeader({
  sessionName,
  productInfo,
  isMultiSelectMode,
  selectedImagesCount,
  onStartMultiSelect,
  onCancelMultiSelect,
  onApplyMultiSelect,
  onSelectAll,
  onOpenPromptBuilder,
}: ChatHeaderProps) {
  return (
    <div className={scssStyles.header}>
      <div>
        <h1 className={scssStyles.title}>{sessionName}</h1>
        <p className={scssStyles.subtitle}>{productInfo}</p>
      </div>
      <div className={scssStyles.headerActions}>
        {isMultiSelectMode ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className={scssStyles.multiSelectInfo}>
                {selectedImagesCount} image{selectedImagesCount !== 1 ? 's' : ''} selected
              </span>
              <button onClick={onSelectAll} className={scssStyles.selectAllButton} data-testid={buildTestId('chat-header', 'select-all')}>
                Select All
              </button>
            </div>
            <button
              onClick={onApplyMultiSelect}
              className={`${scssStyles.iconButton} ${scssStyles.confirmButton}`}
              disabled={selectedImagesCount === 0}
              title="Confirm action"
              data-testid={buildTestId('chat-header', 'apply-multi-select')}
            >
              <Check style={{ width: '20px', height: '20px' }} />
            </button>
            <button
              onClick={onCancelMultiSelect}
              className={`${scssStyles.iconButton} ${scssStyles.cancelButton}`}
              title="Cancel"
              data-testid={buildTestId('chat-header', 'cancel-multi-select')}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onStartMultiSelect('favorite')}
              className={scssStyles.iconButton}
              title="Select multiple images to favorite"
              data-testid={buildTestId('chat-header', 'start-multi-select', 'favorite')}
            >
              <Star style={{ width: '20px', height: '20px' }} />
            </button>
            <button
              onClick={() => onStartMultiSelect('download')}
              className={scssStyles.iconButton}
              title="Select multiple images to download"
              data-testid={buildTestId('chat-header', 'start-multi-select', 'download')}
            >
              <Download style={{ width: '20px', height: '20px' }} />
            </button>
            <button
              onClick={onOpenPromptBuilder}
              className={scssStyles.iconButton}
              title="Open prompt builder"
              data-testid={buildTestId('chat-header', 'open-prompt-builder')}
            >
              <Hammer style={{ width: '20px', height: '20px' }} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
