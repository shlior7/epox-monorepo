'use client';

import { buildTestId } from '@/lib/utils/test-ids';

interface ChipSelectorProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function ChipSelector({ label, options, selected, onToggle }: ChipSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.75)' }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              data-testid={buildTestId('chip', label, option)}
              onClick={() => onToggle(option)}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: active ? 'rgba(94, 234, 212, 0.9)' : 'rgba(148, 163, 184, 0.35)',
                background: active ? 'rgba(45, 212, 191, 0.15)' : 'rgba(15, 23, 42, 0.7)',
                color: 'inherit',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
