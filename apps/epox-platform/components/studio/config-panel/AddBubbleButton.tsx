'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BubbleType } from 'visualizer-types';
import { getAllBubbleDefinitions } from '../bubbles/registry';

// ===== BUBBLE DESCRIPTIONS =====

const BUBBLE_DESCRIPTIONS: Record<string, string> = {
  style: 'Define the artistic style',
  lighting: 'Set lighting conditions',
  'camera-angle': 'Choose camera perspective',
  mood: 'Set emotional atmosphere',
  inspiration: 'Add reference images',
  'color-palette': 'Define color scheme',
  custom: 'Add custom inspiration',
};

// ===== PROPS =====

export interface AddBubbleButtonProps {
  sceneType: string;
  onAddBubble: (type: BubbleType) => void;
  disabled?: boolean;
  maxBubbles?: number;
  currentCount?: number;
  className?: string;
}

// ===== COMPONENT =====

export function AddBubbleButton({
  sceneType,
  onAddBubble,
  disabled = false,
  maxBubbles = 5,
  currentCount = 0,
  className,
}: AddBubbleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMaxReached = currentCount >= maxBubbles;

  // Get bubble options from registry
  const bubbleOptions = useMemo(() => {
    return getAllBubbleDefinitions().map((def) => ({
      type: def.type as BubbleType,
      icon: def.icon,
      label: def.label,
      description: BUBBLE_DESCRIPTIONS[def.type] || `Add ${def.label.toLowerCase()}`,
    }));
  }, []);

  const handleSelect = (type: BubbleType) => {
    onAddBubble(type);
    setIsOpen(false);
  };

  return (
    <div className={cn('group', className)} data-testid={buildTestId('add-bubble-button', sceneType)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled || isMaxReached}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              disabled || isMaxReached
                ? 'border-border/50 opacity-50'
                : 'border-border hover:border-primary hover:bg-primary/5'
            )}
            data-testid={buildTestId('add-bubble-button', 'trigger', sceneType)}
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {bubbleOptions.map((option) => (
            <DropdownMenuItem
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className="flex items-start gap-3 py-2"
              data-testid={buildTestId('add-bubble-option', option.type)}
            >
              <option.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="mt-1 text-center">
        <span className="text-[10px] text-muted-foreground">Add</span>
      </div>
    </div>
  );
}
