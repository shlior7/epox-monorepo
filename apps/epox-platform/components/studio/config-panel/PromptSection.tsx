'use client';

import { buildTestId } from '@/lib/testing/testid';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfigPanelContext } from './ConfigPanelContext';

// ===== PROPS =====

export interface PromptSectionProps {
  // Collection prompt (for single-flow mode, read-only display)
  collectionPrompt?: string;
  showCollectionPrompt?: boolean;
}

// ===== COMPONENT =====

export function PromptSection({ collectionPrompt, showCollectionPrompt = false }: PromptSectionProps) {
  const { state, setUserPrompt, setApplyCollectionPrompt } = useConfigPanelContext();

  return (
    <section className="mt-6" data-testid={buildTestId('prompt-section')}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Prompt
      </h3>

      {/* Collection Prompt (read-only, single-flow mode) */}
      {showCollectionPrompt && collectionPrompt && (
        <div className="mb-3" data-testid={buildTestId('prompt-section', 'collection-prompt')}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="apply-collection-prompt"
              checked={state.applyCollectionPrompt}
              onCheckedChange={(checked) => setApplyCollectionPrompt(!!checked)}
              data-testid={buildTestId('prompt-section', 'collection-prompt-toggle')}
            />
            <label htmlFor="apply-collection-prompt" className="text-xs text-muted-foreground">
              Apply collection prompt
            </label>
          </div>
          {state.applyCollectionPrompt && (
            <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              {collectionPrompt}
            </div>
          )}
        </div>
      )}

      {/* User Prompt */}
      <div data-testid={buildTestId('prompt-section', 'user-prompt')}>
        <Textarea
          placeholder="Add additional prompt details..."
          value={state.userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          This prompt will be applied to all generations.
        </p>
      </div>
    </section>
  );
}
