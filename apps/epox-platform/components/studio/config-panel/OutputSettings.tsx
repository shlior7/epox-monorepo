'use client';

import { buildTestId } from '@/lib/testing/testid';
import { cn } from '@/lib/utils';
import { useConfigPanelContext } from './ConfigPanelContext';
import type { ImageAspectRatio, ImageQuality } from 'visualizer-types';

// ===== OPTIONS =====

const ASPECT_RATIO_OPTIONS: { value: ImageAspectRatio; label: string; icon?: string }[] = [
  { value: '1:1', label: '1:1', icon: '◻' },
  { value: '16:9', label: '16:9', icon: '▭' },
  { value: '9:16', label: '9:16', icon: '▯' },
  { value: '4:3', label: '4:3', icon: '▱' },
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

  return (
    <section className={cn('mt-6', className)} data-testid={buildTestId('output-settings')}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Output
      </h3>

      {/* Aspect Ratio */}
      <div className="mb-3">
        <p className="mb-2 text-xs text-muted-foreground">Aspect Ratio</p>
        <div className="flex gap-1">
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutputSettings({ aspectRatio: opt.value })}
              className={cn(
                'flex flex-1 flex-col items-center rounded-md border py-2 text-xs transition-colors',
                state.outputSettings.aspectRatio === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
              data-testid={buildTestId('output-settings', 'aspect-ratio', opt.value)}
            >
              {opt.icon && <span className="mb-0.5 text-base">{opt.icon}</span>}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div className="mb-3">
        <p className="mb-2 text-xs text-muted-foreground">Quality</p>
        <div className="flex gap-1">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutputSettings({ quality: opt.value })}
              className={cn(
                'flex flex-1 flex-col items-center rounded-md border py-2 transition-colors',
                state.outputSettings.quality === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
              data-testid={buildTestId('output-settings', 'quality', opt.value)}
            >
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Variants */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          Variants per product: {state.outputSettings.variantsCount}
        </p>
        <div className="flex gap-1">
          {VARIANT_OPTIONS.map((count) => (
            <button
              key={count}
              onClick={() => setOutputSettings({ variantsCount: count })}
              className={cn(
                'flex-1 rounded-md border py-1.5 text-sm transition-colors',
                state.outputSettings.variantsCount === count
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border hover:border-primary/50'
              )}
              data-testid={buildTestId('output-settings', 'variants', count)}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
