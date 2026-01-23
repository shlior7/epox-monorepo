'use client';

import { Loader2, Sparkles, Save } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useConfigPanelContext } from './ConfigPanelContext';

// ===== PROPS =====

export interface ActionFooterProps {
  onSave?: () => Promise<void>;
  onGenerate?: () => void;
  isGenerating?: boolean;
  isSaving?: boolean;
  generateLabel?: string;
  generateCount?: number;
  className?: string;
}

// ===== COMPONENT =====

export function ActionFooter({
  onSave,
  onGenerate,
  isGenerating = false,
  isSaving = false,
  generateLabel = 'Generate',
  generateCount,
  className,
}: ActionFooterProps) {
  const { isDirty } = useConfigPanelContext();

  const generateText = generateCount
    ? `${generateLabel} (${generateCount})`
    : generateLabel;

  return (
    <div
      className={cn('shrink-0 border-t border-border bg-card p-3', className)}
      data-testid={buildTestId('action-footer')}
    >
      <div className="flex gap-2">
        {isDirty && onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSave()}
            disabled={isSaving}
            className="flex-1"
            data-testid={buildTestId('action-footer', 'save-button')}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        )}
        <Button
          variant="glow"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating || (generateCount !== undefined && generateCount === 0)}
          className="flex-1"
          data-testid={buildTestId('action-footer', 'generate-button')}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {generateText}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
