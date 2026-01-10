import type { VariantPreview } from '@/lib/services';

interface VariantPreviewGridProps {
  variants: VariantPreview[];
  magnificMix: number;
  onMagnificMixChange: (value: number) => void;
}

export function VariantPreviewGrid({ variants, magnificMix, onMagnificMixChange }: VariantPreviewGridProps) {
  if (variants.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {variants.map((variant) => (
          <VariantCard key={variant.id} variant={variant} magnificMix={magnificMix} />
        ))}
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '360px' }}>
        <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.75)' }}>Magnific before / after balance</span>
        <input type="range" min={0} max={100} value={magnificMix} onChange={(event) => onMagnificMixChange(Number(event.target.value))} />
      </label>
    </div>
  );
}

interface VariantCardProps {
  variant: VariantPreview;
  magnificMix: number;
}

function VariantCard({ variant, magnificMix }: VariantCardProps) {
  const getStatusColor = (status: VariantPreview['status']) => {
    switch (status) {
      case 'completed':
        return 'rgba(34, 197, 94, 0.8)';
      case 'generating':
        return 'rgba(59, 130, 246, 0.8)';
      case 'error':
        return 'rgba(239, 68, 68, 0.8)';
      default:
        return 'rgba(148, 163, 184, 0.6)';
    }
  };

  const getStatusText = (status: VariantPreview['status']) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'generating':
        return 'Generating...';
      case 'completed':
        return 'Ready';
      case 'error':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        background: 'rgba(15, 23, 42, 0.55)',
        position: 'relative',
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '4px 8px',
          borderRadius: '6px',
          background: getStatusColor(variant.status),
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {getStatusText(variant.status)}
      </div>

      {/* Image preview */}
      <div
        style={{
          borderRadius: '12px',
          background: variant.imageUrl
            ? `url(${variant.imageUrl}) center/cover`
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), transparent), linear-gradient(315deg, rgba(16, 185, 129, 0.25), transparent)',
          height: '140px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!variant.imageUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(226, 232, 240, 0.7)',
              fontSize: '0.9rem',
            }}
          >
            {variant.status === 'generating' ? '🎨 Generating...' : '⏳ Pending'}
          </div>
        )}

        {variant.imageUrl && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(90deg, rgba(15, 23, 42, 0.85) ${magnificMix}%, transparent ${magnificMix}%)`,
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                fontSize: '0.75rem',
                color: 'rgba(226, 232, 240, 0.85)',
              }}
            >
              Before / After Magnific
            </span>
          </>
        )}
      </div>

      {/* Variant info */}
      <div>
        <strong style={{ fontSize: '0.95rem' }}>Variant {variant.id}</strong>
        <p style={{ margin: '6px 0', fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.75)' }}>{variant.summary}</p>
        {variant.error && <p style={{ margin: '6px 0', fontSize: '0.8rem', color: 'rgba(239, 68, 68, 0.9)' }}>Error: {variant.error}</p>}
      </div>

      {/* Prompt details */}
      <details style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '10px 12px' }}>
        <summary style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.85)', cursor: 'pointer' }}>View prompt</summary>
        <p style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.7)', marginTop: '8px' }}>{variant.prompt}</p>
      </details>
    </div>
  );
}
