'use client';

import { FileText } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfigPanelContext } from './ConfigPanelContext';

// ===== PROPS =====

export interface CollectionPromptDisplayProps {
  prompt: string;
  className?: string;
}

// ===== COMPONENT =====

export function CollectionPromptDisplay({ prompt, className }: CollectionPromptDisplayProps) {
  const { state, setApplyCollectionPrompt } = useConfigPanelContext();

  if (!prompt) {
    return null;
  }

  return (
    <div
      className={cn('rounded-lg border border-border p-3', className)}
      data-testid={buildTestId('collection-prompt-display')}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          id="apply-collection-prompt"
          checked={state.applyCollectionPrompt}
          onCheckedChange={(checked) => setApplyCollectionPrompt(!!checked)}
          data-testid={buildTestId('collection-prompt-display', 'toggle')}
        />
        <label
          htmlFor="apply-collection-prompt"
          className="flex flex-1 items-center gap-2 text-xs font-medium"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Apply collection prompt
        </label>
      </div>

      {state.applyCollectionPrompt && (
        <div
          className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground"
          data-testid={buildTestId('collection-prompt-display', 'content')}
        >
          {prompt}
        </div>
      )}
    </div>
  );
}
