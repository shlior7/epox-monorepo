'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Sparkles, Tag } from 'lucide-react';
import { useState } from 'react';

interface FlowFooterProps {
  testId?: string;
  sceneType?: string;
  category?: string;
  availableSceneTypes: string[];
  isGenerating: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onChangeSceneType?: (sceneType: string) => void;
  onGenerate?: () => void;
  compact?: boolean;
}

export function FlowFooter({
  testId,
  sceneType,
  category,
  availableSceneTypes,
  isGenerating,
  isSelected = false,
  onSelect,
  onChangeSceneType,
  onGenerate,
  compact,
}: FlowFooterProps) {
  const [showCustomSceneInput, setShowCustomSceneInput] = useState(false);
  const [customSceneType, setCustomSceneType] = useState('');

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-border px-2 py-1.5',
        compact && 'border-t-0 px-0 py-1'
      )}
      data-testid={buildTestId(testId, 'footer')}
    >
      {/* Left: Checkbox + Scene Type */}
      <div className="flex items-center gap-1">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="mr-1 h-4 w-4 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
            data-testid={buildTestId(testId, 'checkbox')}
          />
        )}

        {/* Category Tag */}
        {category && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            data-testid={buildTestId(testId, 'category-tag')}
          >
            <Tag className="h-2.5 w-2.5" />
            {category}
          </span>
        )}

        {/* Scene Type Tag Dropdown */}
        <DropdownMenu open={showCustomSceneInput ? true : undefined}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                sceneType
                  ? 'bg-muted text-muted-foreground hover:bg-accent'
                  : 'border border-dashed border-border text-muted-foreground hover:border-foreground/30'
              )}
              data-testid={buildTestId(testId, 'scene-type-dropdown')}
            >
              <span className="max-w-[100px] truncate">{sceneType || 'Scene type'}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
            {showCustomSceneInput ? (
              <div className="p-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Enter scene type..."
                  value={customSceneType}
                  onChange={(e) => setCustomSceneType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customSceneType.trim()) {
                      onChangeSceneType?.(customSceneType.trim());
                      setShowCustomSceneInput(false);
                      setCustomSceneType('');
                    } else if (e.key === 'Escape') {
                      setShowCustomSceneInput(false);
                      setCustomSceneType('');
                    }
                  }}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                  autoFocus
                />
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => {
                      if (customSceneType.trim()) {
                        onChangeSceneType?.(customSceneType.trim());
                        setShowCustomSceneInput(false);
                        setCustomSceneType('');
                      }
                    }}
                    className="flex-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomSceneInput(false);
                      setCustomSceneType('');
                    }}
                    className="flex-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {availableSceneTypes.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeSceneType?.(type);
                    }}
                    className={cn(
                      type === sceneType ? 'bg-primary/10 font-medium text-primary' : ''
                    )}
                    data-testid={buildTestId(testId, 'scene-type', type)}
                  >
                    {type}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCustomSceneInput(true);
                  }}
                  className="border-t border-border font-medium text-primary"
                  data-testid={buildTestId(testId, 'scene-type', 'custom')}
                >
                  + Custom...
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Generate Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate?.();
              }}
              disabled={isGenerating}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                isGenerating
                  ? 'cursor-not-allowed text-muted-foreground'
                  : 'text-primary hover:bg-primary/10'
              )}
              data-testid={buildTestId(testId, 'action-generate')}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isGenerating ? 'Generating...' : 'Generate images'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
