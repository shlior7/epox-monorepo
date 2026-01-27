'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { BubbleChip } from './InspirationBubble';
import type { BubbleValue, SceneTypeInspirationMap } from 'visualizer-types';

export interface CollectionSettingsSectionProps {
  collectionSessionId: string;
  collectionName: string;
  collectionPrompt?: string;
  generalInspiration?: BubbleValue[];
  sceneTypeInspiration?: SceneTypeInspirationMap;
  flowSceneType?: string;
  applyCollectionSettings: boolean;
  onToggleApply: (apply: boolean) => void;
  className?: string;
}

export function CollectionSettingsSection({
  collectionSessionId,
  collectionName,
  collectionPrompt,
  generalInspiration = [],
  sceneTypeInspiration,
  flowSceneType,
  applyCollectionSettings,
  onToggleApply,
  className,
}: CollectionSettingsSectionProps) {
  // Get bubbles: general + scene-type specific
  const filteredBubbles = useMemo(() => {
    const bubbles: BubbleValue[] = [...generalInspiration];

    // Add scene-type-specific bubbles if available
    if (flowSceneType && sceneTypeInspiration?.[flowSceneType]?.bubbles) {
      bubbles.push(...sceneTypeInspiration[flowSceneType].bubbles);
    }

    return bubbles;
  }, [flowSceneType, sceneTypeInspiration, generalInspiration]);

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
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

      {/* Apply Collection Settings Toggle */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-accent/30 p-3">
        <Checkbox
          id="apply-collection-settings"
          checked={applyCollectionSettings}
          onCheckedChange={onToggleApply}
          className="mt-0.5"
          data-testid={buildTestId('collection-settings-section', 'apply-toggle')}
        />
        <div className="flex-1 space-y-1">
          <label
            htmlFor="apply-collection-settings"
            className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Apply collection settings
          </label>
          <p className="text-xs text-muted-foreground">
            {applyCollectionSettings
              ? 'Collection inspiration and prompt will be merged with this flow\'s settings'
              : 'Only this flow\'s settings will be used'}
          </p>
        </div>
      </div>

      {/* Collection Content (shown when toggle is ON) */}
      {applyCollectionSettings && (hasBubbles || hasPrompt) && (
        <div className="space-y-3">
          {/* Collection Inspiration Bubbles */}
          {hasBubbles && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">Inspiration</h4>
                {flowSceneType && (
                  <Badge variant="secondary" className="text-[10px]">
                    {flowSceneType}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredBubbles.map((bubble, index) => {
                  const isReferenceWithImage = bubble.type === 'reference' && bubble.image?.url;
                  return (
                    <BubbleChip
                      key={`collection-bubble-${index}`}
                      value={bubble}
                      sceneType={flowSceneType || 'general'}
                      index={index}
                      onClick={isReferenceWithImage ? () => setPreviewImageUrl(bubble.image!.url) : undefined}
                      className={cn('opacity-75', !isReferenceWithImage && 'pointer-events-none')}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Collection Prompt (Read-Only) */}
          {hasPrompt && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Prompt</h4>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-sm text-muted-foreground">{collectionPrompt}</p>
              </div>
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
