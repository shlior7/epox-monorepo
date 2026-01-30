'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FolderOpen, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { BubbleChip } from './InspirationBubble';
import { getBubbleDefinition } from '../bubbles/registry';
import type { BubbleValue, InspirationSection } from 'visualizer-types';
import { getBubbleMergeStrategy } from 'visualizer-types';

export interface CollectionSettingsSectionProps {
  collectionSessionId: string;
  collectionName: string;
  collectionPrompt?: string;
  generalInspiration?: BubbleValue[];
  inspirationSections?: InspirationSection[];
  flowSceneType?: string;
  flowCategoryIds?: string[];
  flowBubbles?: BubbleValue[];
  /** Category-level bubbles from the selected category's generationSettings */
  categoryBubbles?: BubbleValue[];
  /** Name of the selected category (for display) */
  selectedCategoryName?: string;
  applyCollectionInspiration: boolean;
  onToggleApplyInspiration: (apply: boolean) => void;
  applyCollectionPrompt: boolean;
  onToggleApplyPrompt: (apply: boolean) => void;
  className?: string;
}

export function CollectionSettingsSection({
  collectionSessionId,
  collectionName,
  collectionPrompt,
  generalInspiration = [],
  inspirationSections = [],
  flowSceneType,
  flowCategoryIds = [],
  flowBubbles = [],
  categoryBubbles,
  selectedCategoryName,
  applyCollectionInspiration,
  onToggleApplyInspiration,
  applyCollectionPrompt,
  onToggleApplyPrompt,
  className,
}: CollectionSettingsSectionProps) {
  // Show only the immediate parent level's bubbles:
  // If a category is selected and has bubbles → show category bubbles
  // Otherwise → fall back to collection general inspiration
  const { filteredBubbles, sourceLabel } = useMemo(() => {
    const hasCategoryBubbles = categoryBubbles && categoryBubbles.length > 0;

    const bubbles = hasCategoryBubbles ? [...categoryBubbles] : [...generalInspiration];

    // Only keep bubbles that have actual values configured
    const filtered = bubbles.filter((b) => {
      const def = getBubbleDefinition(b.type);
      return def && !def.isEmpty(b);
    });

    return {
      filteredBubbles: filtered,
      sourceLabel: hasCategoryBubbles
        ? `Category: ${selectedCategoryName || 'Selected'}`
        : 'Collection general',
    };
  }, [categoryBubbles, selectedCategoryName, generalInspiration]);

  // Determine which single-strategy bubble types are overridden by flow-level bubbles
  const overriddenTypes = useMemo(() => {
    const types = new Set<string>();
    for (const fb of flowBubbles) {
      if (getBubbleMergeStrategy(fb.type) === 'single') {
        const def = getBubbleDefinition(fb.type);
        if (def && !def.isEmpty(fb)) {
          types.add(fb.type);
        }
      }
    }
    return types;
  }, [flowBubbles]);

  const hasBubbles = filteredBubbles.length > 0;
  const hasPrompt = !!collectionPrompt?.trim();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  return (
    <section
      className={cn('space-y-4 border-b border-border pb-4', className)}
      data-testid={buildTestId('collection-settings-section')}
    >
      {/* Collection Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Collection
          </h3>
        </div>
        <Link
          href={`/studio/collections/${collectionSessionId}`}
          className="transition-colors hover:text-primary"
        >
          <Badge variant="outline" className="text-xs">
            {collectionName}
          </Badge>
        </Link>
      </div>

      {/* Apply Collection Inspiration Toggle */}
      <div className="flex items-center gap-3 rounded-lg">
        <Checkbox
          id="apply-collection-inspiration"
          checked={applyCollectionInspiration}
          onCheckedChange={onToggleApplyInspiration}
          className="mt-0.5"
          data-testid={buildTestId('collection-settings-section', 'apply-inspiration-toggle')}
        />
        <div className="flex-1 space-y-0.5">
          <label
            htmlFor="apply-collection-inspiration"
            className="cursor-pointer text-sm font-medium leading-none"
          >
            Apply collection inspiration
          </label>
          <p className="text-xs text-muted-foreground">
            {applyCollectionInspiration
              ? 'Collection generation settings will be merged with this flow'
              : "Only this flow's inspiration will be used"}
          </p>
        </div>
      </div>

      {/* Collection Inspiration Bubbles (shown when inspiration toggle is ON) */}
      {applyCollectionInspiration && hasBubbles && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h4 className="text-sm font-medium text-muted-foreground">Inherited</h4>
            <Badge variant="secondary" className="text-[10px]">
              {sourceLabel}
            </Badge>
          </div>
          <TooltipProvider delayDuration={300}>
            <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-3">
              {filteredBubbles.map((bubble, index) => {
                const isReferenceWithImage = bubble.type === 'reference' && bubble.image?.url;
                const isOverridden = overriddenTypes.has(bubble.type);
                const bubbleDef = getBubbleDefinition(bubble.type);
                const bubbleLabel = bubbleDef?.label ?? bubble.type;

                if (isOverridden) {
                  return (
                    <Tooltip key={`collection-bubble-${index}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="relative"
                          data-testid={buildTestId('collection-settings-section', `overridden-${bubble.type}`)}
                        >
                          <BubbleChip
                            value={bubble}
                            sceneType={flowSceneType || 'general'}
                            index={index}
                            className="pointer-events-none opacity-30 grayscale"
                          />
                          <div className="absolute right-1 top-1">
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-center">
                        <p className="font-medium">{bubbleLabel} overridden</p>
                        <p className="text-muted-foreground">Flow-level {bubbleLabel.toLowerCase()} takes priority</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <BubbleChip
                    key={`collection-bubble-${index}`}
                    value={bubble}
                    sceneType={flowSceneType || 'general'}
                    index={index}
                    onClick={
                      isReferenceWithImage ? () => setPreviewImageUrl(bubble.image!.url) : undefined
                    }
                    className={cn('opacity-75', !isReferenceWithImage && 'pointer-events-none')}
                  />
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Apply Collection Prompt Toggle */}
      {hasPrompt && (
        <div className="space-y-2">
          <div className="bg-accent/12 flex items-center gap-3 rounded-lg">
            <Checkbox
              id="apply-collection-prompt"
              checked={applyCollectionPrompt}
              onCheckedChange={onToggleApplyPrompt}
              className="mt-0.5"
              data-testid={buildTestId('collection-settings-section', 'apply-prompt-toggle')}
            />
            <div className="flex-1 space-y-0.5">
              <label
                htmlFor="apply-collection-prompt"
                className="cursor-pointer text-sm font-medium leading-none"
              >
                Apply collection prompt
              </label>
            </div>
          </div>
          {applyCollectionPrompt && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-sm text-muted-foreground">{collectionPrompt}</p>
            </div>
          )}
        </div>
      )}
      {/* Reference Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
        <DialogContent
          className="max-w-2xl p-2"
          data-testid={buildTestId('collection-settings-section', 'image-preview')}
        >
          {previewImageUrl && (
            <Image
              src={previewImageUrl}
              alt="Reference preview"
              width={800}
              height={800}
              className="h-auto w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
