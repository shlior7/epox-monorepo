'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Search } from 'lucide-react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { InspirationBubbleValue, InspirationImage } from 'visualizer-types';

// ===== STYLE PRESET DATA =====

interface StylePresetItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

// Sample style presets (would be fetched from API in production)
const STYLE_PRESETS: StylePresetItem[] = [
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean lines, neutral colors, uncluttered spaces',
    imageUrl: '/presets/modern-minimalist.jpg',
    tags: ['modern', 'minimalist', 'clean'],
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light, airy, functional with natural materials',
    imageUrl: '/presets/scandinavian.jpg',
    tags: ['nordic', 'light', 'natural'],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Exposed materials, metal accents, raw textures',
    imageUrl: '/presets/industrial.jpg',
    tags: ['industrial', 'urban', 'metal'],
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    description: 'Eclectic, colorful, layered patterns',
    imageUrl: '/presets/bohemian.jpg',
    tags: ['boho', 'colorful', 'eclectic'],
  },
  {
    id: 'mid-century',
    name: 'Mid-Century Modern',
    description: 'Retro elegance, organic shapes, warm tones',
    imageUrl: '/presets/mid-century.jpg',
    tags: ['retro', '50s', 'organic'],
  },
  {
    id: 'rustic',
    name: 'Rustic',
    description: 'Natural wood, warm textures, cozy atmosphere',
    imageUrl: '/presets/rustic.jpg',
    tags: ['rustic', 'wood', 'cozy'],
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Beach vibes, blues and whites, natural light',
    imageUrl: '/presets/coastal.jpg',
    tags: ['beach', 'coastal', 'blue'],
  },
  {
    id: 'luxurious',
    name: 'Luxurious',
    description: 'Rich materials, elegant details, sophisticated',
    imageUrl: '/presets/luxurious.jpg',
    tags: ['luxury', 'elegant', 'rich'],
  },
];

// ===== PROPS =====

export interface StyleExplorerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: InspirationBubbleValue) => void;
  currentValue?: InspirationBubbleValue;
}

// ===== COMPONENT =====

export function StyleExplorerModal({
  open,
  onOpenChange,
  onSelect,
  currentValue,
}: StyleExplorerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<StylePresetItem | null>(null);

  const filteredPresets = STYLE_PRESETS.filter(
    (preset) =>
      preset.name.toLowerCase().includes(search.toLowerCase()) ||
      preset.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = () => {
    if (selectedPreset) {
      const value: InspirationBubbleValue = {
        type: 'style',
        preset: selectedPreset.name,
        image: {
          url: selectedPreset.imageUrl,
          tags: selectedPreset.tags,
          addedAt: new Date().toISOString(),
          sourceType: 'library',
        },
      };
      onSelect(value);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        testId={buildTestId('style-explorer-modal')}
      >
        <DialogHeader>
          <DialogTitle>Choose Style</DialogTitle>
          <DialogDescription>
            Select a style preset to apply to your generation
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search styles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid={buildTestId('style-explorer-modal', 'search')}
          />
        </div>

        {/* Style Grid */}
        <div
          className="grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3"
          data-testid={buildTestId('style-explorer-modal', 'grid')}
        >
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset)}
              className={cn(
                'group relative overflow-hidden rounded-lg border-2 transition-all',
                selectedPreset?.id === preset.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
              data-testid={buildTestId('style-explorer-modal', 'preset', preset.id)}
            >
              <div className="aspect-[4/3] bg-muted">
                {/* Placeholder for image - would use actual images in production */}
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 p-4">
                  <span className="text-center text-xs text-muted-foreground">
                    {preset.name}
                  </span>
                </div>
              </div>
              <div className="p-2">
                <h4 className="text-xs font-medium">{preset.name}</h4>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                  {preset.description}
                </p>
              </div>
              {selectedPreset?.id === preset.id && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filteredPresets.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No styles found matching "{search}"
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedPreset}>
            Apply Style
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
