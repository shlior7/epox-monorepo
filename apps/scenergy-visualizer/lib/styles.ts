// Common styles extracted for reuse
import type { CSSProperties } from 'react';

export const inputStyle: CSSProperties = {
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(15, 23, 42, 0.7)',
  padding: '10px 12px',
  color: 'inherit',
  width: '100%',
};

export const fieldLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '0.95rem',
  color: 'rgba(226, 232, 240, 0.9)',
};

export const expertDetailsStyle: CSSProperties = {
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(15, 23, 42, 0.55)',
};

export const detailsContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '12px 18px 16px',
};

export const summaryStyle: CSSProperties = {
  cursor: 'pointer',
  listStyle: 'none',
  padding: '12px 18px',
  fontSize: '0.9rem',
  color: 'rgba(226, 232, 240, 0.85)',
};

export const buttonPrimaryStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(16, 185, 129, 0.6))',
  border: 'none',
  color: '#0f172a',
  padding: '10px 16px',
  borderRadius: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const buttonSecondaryStyle: CSSProperties = {
  background: 'rgba(59, 130, 246, 0.2)',
  border: '1px solid rgba(59, 130, 246, 0.5)',
  color: '#dbeafe',
  padding: '10px 16px',
  borderRadius: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const buttonTertiaryStyle: CSSProperties = {
  background: 'rgba(94, 234, 212, 0.15)',
  border: '1px solid rgba(94, 234, 212, 0.35)',
  color: '#5eead4',
  borderRadius: '12px',
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 600,
};
