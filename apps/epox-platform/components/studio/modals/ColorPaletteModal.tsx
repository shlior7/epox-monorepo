'use client';

import { useState } from 'react';
import { Check, Pipette, Palette } from 'lucide-react';
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
import type { ColorPaletteBubbleValue } from 'visualizer-types';

// ===== PRESET PALETTES =====

interface ColorPalettePreset {
  id: string;
  name: string;
  colors: string[];
}

const PRESET_PALETTES: ColorPalettePreset[] = [
  {
    id: 'warm-neutrals',
    name: 'Warm Neutrals',
    colors: ['#F5F0E8', '#E8DFD3', '#C4B59D', '#8B7355', '#4A3728'],
  },
  {
    id: 'cool-grays',
    name: 'Cool Grays',
    colors: ['#F8F9FA', '#E9ECEF', '#ADB5BD', '#6C757D', '#343A40'],
  },
  {
    id: 'earth-tones',
    name: 'Earth Tones',
    colors: ['#D4C5A9', '#B5A888', '#8B7355', '#5D4E37', '#3D3121'],
  },
  {
    id: 'ocean-blues',
    name: 'Ocean Blues',
    colors: ['#E0F2FE', '#7DD3FC', '#38BDF8', '#0EA5E9', '#0369A1'],
  },
  {
    id: 'forest-greens',
    name: 'Forest Greens',
    colors: ['#ECFDF5', '#86EFAC', '#4ADE80', '#22C55E', '#166534'],
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    colors: ['#FEF3C7', '#FCD34D', '#F59E0B', '#EA580C', '#9A3412'],
  },
  {
    id: 'berry-tones',
    name: 'Berry Tones',
    colors: ['#FCE7F3', '#F9A8D4', '#EC4899', '#BE185D', '#831843'],
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: ['#FFFFFF', '#D1D5DB', '#9CA3AF', '#4B5563', '#111827'],
  },
];

// ===== TABS =====

type PaletteTab = 'presets' | 'extract' | 'custom';

// ===== PROPS =====

export interface ColorPaletteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: ColorPaletteBubbleValue) => void;
  currentValue?: ColorPaletteBubbleValue;
}

// ===== COMPONENT =====

export function ColorPaletteModal({
  open,
  onOpenChange,
  onSelect,
  currentValue,
}: ColorPaletteModalProps) {
  const [activeTab, setActiveTab] = useState<PaletteTab>('presets');
  const [selectedPreset, setSelectedPreset] = useState<ColorPalettePreset | null>(null);
  const [customColors, setCustomColors] = useState<string[]>(['#FFFFFF', '#000000']);
  const [newColor, setNewColor] = useState('#6366F1');

  const handleAddCustomColor = () => {
    if (customColors.length < 6 && newColor) {
      setCustomColors([...customColors, newColor]);
    }
  };

  const handleRemoveCustomColor = (index: number) => {
    setCustomColors(customColors.filter((_, i) => i !== index));
  };

  const handleSelect = () => {
    let colors: string[] = [];

    if (activeTab === 'presets' && selectedPreset) {
      colors = selectedPreset.colors;
    } else if (activeTab === 'custom' && customColors.length > 0) {
      colors = customColors;
    }

    if (colors.length > 0) {
      const value: ColorPaletteBubbleValue = {
        type: 'color-palette',
        colors: colors,
      };
      onSelect(value);
      onOpenChange(false);
    }
  };

  const canSelect =
    (activeTab === 'presets' && selectedPreset) ||
    (activeTab === 'custom' && customColors.length >= 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        testId={buildTestId('color-palette-modal')}
      >
        <DialogHeader>
          <DialogTitle>Choose Color Palette</DialogTitle>
          <DialogDescription>
            Select a preset palette or create your own
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-lg bg-muted/50 p-1"
          data-testid={buildTestId('color-palette-modal', 'tabs')}
        >
          {(['presets', 'extract', 'custom'] as PaletteTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              data-testid={buildTestId('color-palette-modal', 'tab', tab)}
            >
              {tab === 'presets' && 'Presets'}
              {tab === 'extract' && 'Extract'}
              {tab === 'custom' && 'Custom'}
            </button>
          ))}
        </div>

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div
            className="grid max-h-[300px] grid-cols-2 gap-3 overflow-y-auto py-2"
            data-testid={buildTestId('color-palette-modal', 'presets-tab')}
          >
            {PRESET_PALETTES.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPreset(palette)}
                className={cn(
                  'rounded-lg border-2 p-3 transition-all',
                  selectedPreset?.id === palette.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
                data-testid={buildTestId('color-palette-modal', 'preset', palette.id)}
              >
                <div className="mb-2 flex gap-0.5">
                  {palette.colors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-left text-xs font-medium">{palette.name}</p>
              </button>
            ))}
          </div>
        )}

        {/* Extract Tab */}
        {activeTab === 'extract' && (
          <div className="py-4" data-testid={buildTestId('color-palette-modal', 'extract-tab')}>
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8">
              <Pipette className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Extract from image</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Upload an image to automatically extract its color palette
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Upload Image
              </Button>
            </div>
          </div>
        )}

        {/* Custom Tab */}
        {activeTab === 'custom' && (
          <div className="py-4" data-testid={buildTestId('color-palette-modal', 'custom-tab')}>
            {/* Current palette */}
            <div className="mb-4">
              <p className="mb-2 text-xs text-muted-foreground">
                Your palette ({customColors.length}/6 colors)
              </p>
              <div className="flex gap-2">
                {customColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleRemoveCustomColor(i)}
                    className="group relative h-10 w-10 rounded-md border border-border"
                    style={{ backgroundColor: color }}
                    title="Click to remove"
                  >
                    <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-xs text-white">×</span>
                    </span>
                  </button>
                ))}
                {customColors.length < 6 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer p-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomColor}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            {customColors.length >= 2 && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">Preview</p>
                <div className="flex h-8 overflow-hidden rounded-md">
                  {customColors.map((color, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!canSelect}>
            Apply Palette
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
