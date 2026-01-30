'use client';

import { useState } from 'react';
import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { ImageAspectRatio, ImageQuality } from 'visualizer-types';

// ===== OPTIONS =====

const ASPECT_RATIO_OPTIONS: {
  value: ImageAspectRatio;
  label: string;
  useCase: string;
  width: number;
  height: number;
}[] = [
  { value: '1:1', label: '1:1', useCase: 'Square', width: 40, height: 40 },
  { value: '16:9', label: '16:9', useCase: 'Landscape', width: 56, height: 31.5 },
  { value: '9:16', label: '9:16', useCase: 'Portrait', width: 31.5, height: 56 },
  { value: '2:3', label: '2:3', useCase: 'Portrait', width: 35, height: 52.5 },
  { value: '3:2', label: '3:2', useCase: 'Landscape', width: 52.5, height: 35 },
  { value: '3:4', label: '3:4', useCase: 'Portrait', width: 35, height: 46.5 },
  { value: '4:3', label: '4:3', useCase: 'Landscape', width: 46.5, height: 35 },
  { value: '21:9', label: '21:9', useCase: 'Ultra Wide', width: 63, height: 27 },
];

const QUALITY_OPTIONS: { value: ImageQuality; label: string; description: string }[] = [
  { value: '1k', label: '1K', description: 'Fast' },
  { value: '2k', label: '2K', description: 'Balanced' },
  { value: '4k', label: '4K', description: 'High Quality' },
];

const VARIANT_OPTIONS = [1, 2, 4];

// ===== PROPS =====

export interface OutputSettingsPanelProps {
  className?: string;
}

// ===== COMPONENT =====

export function OutputSettingsPanel({ className }: OutputSettingsPanelProps) {
  const { state, setOutputSettings } = useConfigPanelContext();
  const [aspectRatioOpen, setAspectRatioOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);

  const selectedAspectRatio = ASPECT_RATIO_OPTIONS.find(
    (opt) => opt.value === state.outputSettings.aspectRatio
  );
  const selectedQuality = QUALITY_OPTIONS.find((opt) => opt.value === state.outputSettings.quality);

  return (
    <section className={cn('mt-2', className)} data-testid={buildTestId('output-settings')}>
      {/* One-line settings row */}
      <div className="items-left flex gap-2">
        {/* Aspect Ratio */}
        <Popover open={aspectRatioOpen} onOpenChange={setAspectRatioOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/50',
                aspectRatioOpen && 'border-primary'
              )}
              data-testid={buildTestId('output-settings', 'aspect-ratio-trigger')}
            >
              {selectedAspectRatio && (
                <div
                  className="rounded-sm bg-muted-foreground/30"
                  style={{
                    width: `${selectedAspectRatio.width / 2.5}px`,
                    height: `${selectedAspectRatio.height / 2.5}px`,
                  }}
                />
              )}
              <span className="text-xs font-medium">{selectedAspectRatio?.label}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[320px] p-3"
            align="start"
            side="top"
            data-testid={buildTestId('output-settings', 'aspect-ratio-menu')}
          >
            <p className="mb-3 text-xs font-medium text-muted-foreground">Aspect Ratio</p>
            <div className="grid grid-cols-4 gap-3">
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setOutputSettings({ aspectRatio: opt.value });
                    setAspectRatioOpen(false);
                  }}
                  className={cn(
                    'group relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                    state.outputSettings.aspectRatio === opt.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                  data-testid={buildTestId('output-settings', 'aspect-ratio', opt.value)}
                >
                  {/* Skeleton representation */}
                  <div
                    className={cn(
                      'rounded-sm transition-colors',
                      state.outputSettings.aspectRatio === opt.value
                        ? 'bg-primary'
                        : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                    )}
                    style={{
                      width: `${opt.width}px`,
                      height: `${opt.height}px`,
                      maxWidth: '100%',
                      maxHeight: '60px',
                    }}
                  />
                  {/* Label */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        state.outputSettings.aspectRatio === opt.value
                          ? 'text-primary'
                          : 'text-foreground'
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{opt.useCase}</span>
                  </div>
                  {/* Check mark */}
                  {state.outputSettings.aspectRatio === opt.value && (
                    <div className="absolute right-1 top-1">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quality */}
        <DropdownMenu open={qualityOpen} onOpenChange={setQualityOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/50',
                qualityOpen && 'border-primary'
              )}
              data-testid={buildTestId('output-settings', 'quality-trigger')}
            >
              <span className="text-xs font-medium">{selectedQuality?.label}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-[180px]"
            data-testid={buildTestId('output-settings', 'quality-menu')}
          >
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setOutputSettings({ quality: opt.value });
                  setQualityOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors',
                  state.outputSettings.quality === opt.value
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent'
                )}
                data-testid={buildTestId('output-settings', 'quality', opt.value)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
                {state.outputSettings.quality === opt.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Variants */}
        <DropdownMenu open={variantsOpen} onOpenChange={setVariantsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 transition-colors hover:border-primary/50',
                variantsOpen && 'border-primary'
              )}
              data-testid={buildTestId('output-settings', 'variants-trigger')}
            >
              <span className="text-xs font-medium">{state.outputSettings.variantsCount}x</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-[120px]"
            data-testid={buildTestId('output-settings', 'variants-menu')}
          >
            {VARIANT_OPTIONS.map((count) => (
              <button
                key={count}
                onClick={() => {
                  setOutputSettings({ variantsCount: count });
                  setVariantsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors',
                  state.outputSettings.variantsCount === count
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent'
                )}
                data-testid={buildTestId('output-settings', 'variants', count)}
              >
                <span className="text-sm font-medium">
                  {count} variant{count > 1 ? 's' : ''}
                </span>
                {state.outputSettings.variantsCount === count && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
