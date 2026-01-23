'use client';

import { useState } from 'react';
import { Plus, ImageIcon, Palette, Sun, Sparkles, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTestId } from '@/lib/testing/testid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InspirationBubbleType } from 'visualizer-types';

// ===== BUBBLE TYPE OPTIONS =====

interface BubbleTypeOption {
  type: InspirationBubbleType;
  icon: React.ElementType;
  label: string;
  description: string;
}

const BUBBLE_TYPE_OPTIONS: BubbleTypeOption[] = [
  {
    type: 'inspiration',
    icon: ImageIcon,
    label: 'Inspiration Image',
    description: 'Upload or select an inspiration image',
  },
  {
    type: 'style',
    icon: Sparkles,
    label: 'Style Reference',
    description: 'Choose a style preset or image',
  },
  {
    type: 'color-palette',
    icon: Palette,
    label: 'Color Palette',
    description: 'Extract or select colors',
  },
  {
    type: 'lighting',
    icon: Sun,
    label: 'Lighting',
    description: 'Set lighting conditions',
  },
  {
    type: 'custom',
    icon: MoreHorizontal,
    label: 'Custom',
    description: 'Add a custom reference',
  },
];

// ===== PROPS =====

export interface AddBubbleButtonProps {
  sceneType: string;
  onAddBubble: (type: InspirationBubbleType) => void;
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

  const handleSelect = (type: InspirationBubbleType) => {
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
          {BUBBLE_TYPE_OPTIONS.map((option) => (
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
