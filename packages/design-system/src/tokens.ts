/**
 * Design Tokens - Shared design system for both epox-platform and scenergy-visualizer
 *
 * Inspired by modern AI generation platforms (Ideogram, Kling, Midjourney)
 * with a focus on:
 * - Deep, rich dark themes with vibrant accents
 * - Sophisticated color gradients
 * - Clear visual hierarchy
 * - Premium, cinematic feel
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Pure neutrals
  white: '#ffffff',
  black: '#000000',

  // Charcoal Neutrals - Cinema/Studio feel (primary for dark theme)
  charcoal: {
    950: '#0a0a0b', // Deepest black - overlays
    900: '#0f1012', // Background deep
    850: '#131417', // Main app background
    800: '#18191d', // Card backgrounds
    750: '#1d1f24', // Elevated surfaces
    700: '#24262d', // Borders, dividers
    600: '#2e3139', // Muted borders
    500: '#3d4149', // Disabled states
    400: '#5c616b', // Tertiary text
    300: '#8b919d', // Secondary text
    200: '#b8bcc6', // Primary text muted
    100: '#e4e6eb', // Primary text
    50: '#f4f5f7', // Bright text
  },

  // Slate - Cool undertones (for light theme compatibility)
  slate: {
    950: '#020617',
    900: '#0f172a',
    800: '#1e293b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },

  // Primary accent - Vibrant Indigo/Violet gradient
  indigo: {
    900: '#312e81',
    800: '#3730a3',
    700: '#4338ca',
    600: '#4f46e5',
    500: '#6366f1', // Primary accent
    400: '#818cf8',
    300: '#a5b4fc',
    200: '#c7d2fe',
    100: '#e0e7ff',
    50: '#eef2ff',
  },

  // Secondary accent - Electric Cyan/Teal
  cyan: {
    900: '#164e63',
    800: '#155e75',
    700: '#0e7490',
    600: '#0891b2',
    500: '#06b6d4', // Secondary accent
    400: '#22d3ee',
    300: '#67e8f9',
    200: '#a5f3fc',
    100: '#cffafe',
    50: '#ecfeff',
  },

  // Warm accent - Amber/Gold (premium feel)
  amber: {
    900: '#78350f',
    800: '#92400e',
    700: '#b45309',
    600: '#d97706',
    500: '#f59e0b', // Warm accent
    400: '#fbbf24',
    300: '#fcd34d',
    200: '#fde68a',
    100: '#fef3c7',
    50: '#fffbeb',
  },

  // Status colors
  emerald: {
    700: '#047857',
    600: '#059669',
    500: '#10b981',
    400: '#34d399',
    300: '#6ee7b7',
  },

  rose: {
    700: '#be123c',
    600: '#e11d48',
    500: '#f43f5e',
    400: '#fb7185',
    300: '#fda4af',
  },

  // Specialty gradients (CSS values) — Monochrome Pro
  gradients: {
    primary: 'linear-gradient(135deg, #8ab4f8 0%, #6d9bdb 50%, #5a87c7 100%)',
    secondary: 'linear-gradient(135deg, #94a3b8 0%, #8ab4f8 100%)',
    warm: 'linear-gradient(135deg, #ebebeb 0%, #cccccc 100%)',
    premium: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #b0b0b0 100%)',
    aurora: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 50%, #8ab4f8 100%)',
    surface: 'linear-gradient(180deg, rgba(138, 180, 248, 0.08) 0%, transparent 100%)',
    glow: 'radial-gradient(ellipse at center, rgba(138, 180, 248, 0.15) 0%, transparent 70%)',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Playfair Display", Georgia, serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  // Font sizes
  fontSize: {
    '2xs': '0.625rem', // 10px
    xs: '0.75rem', // 12px
    sm: '0.8125rem', // 13px
    md: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  '0': '0',
  '0.5': '0.125rem', // 2px
  '1': '0.25rem', // 4px
  '1.5': '0.375rem', // 6px
  '2': '0.5rem', // 8px
  '2.5': '0.625rem', // 10px
  '3': '0.75rem', // 12px
  '3.5': '0.875rem', // 14px
  '4': '1rem', // 16px
  '5': '1.25rem', // 20px
  '6': '1.5rem', // 24px
  '7': '1.75rem', // 28px
  '8': '2rem', // 32px
  '9': '2.25rem', // 36px
  '10': '2.5rem', // 40px
  '12': '3rem', // 48px
  '14': '3.5rem', // 56px
  '16': '4rem', // 64px
  '20': '5rem', // 80px
  '24': '6rem', // 96px
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  // Subtle shadows for dark theme
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  none: 'none',

  // Glow effects for accents — Monochrome Pro
  glow: {
    primary: '0 0 20px rgba(138, 180, 248, 0.3), 0 0 40px rgba(138, 180, 248, 0.1)',
    primaryLg: '0 0 30px rgba(138, 180, 248, 0.4), 0 0 60px rgba(138, 180, 248, 0.2)',
    cyan: '0 0 20px rgba(148, 163, 184, 0.3), 0 0 40px rgba(148, 163, 184, 0.1)',
    amber: '0 0 20px rgba(224, 224, 224, 0.3), 0 0 40px rgba(224, 224, 224, 0.1)',
    success: '0 0 20px rgba(45, 212, 191, 0.3), 0 0 40px rgba(45, 212, 191, 0.1)',
  },
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  DEFAULT: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  fixed: 100,
  backdrop: 200,
  drawer: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// SEMANTIC TOKENS (Dark Theme - Primary)
// =============================================================================

export const semanticDark = {
  // Backgrounds
  background: colors.charcoal[850],
  backgroundAlt: colors.charcoal[800],
  backgroundDeep: colors.charcoal[900],

  // Surfaces
  surface: colors.charcoal[800],
  surfaceHover: colors.charcoal[750],
  surfaceActive: colors.charcoal[700],
  surfaceStrong: colors.charcoal[700],
  surfaceMuted: colors.charcoal[600],

  // Text
  text: colors.charcoal[100],
  textPrimary: colors.charcoal[100],
  textSecondary: colors.charcoal[300],
  textTertiary: colors.charcoal[400],
  textMuted: colors.charcoal[500],

  // Borders
  border: colors.charcoal[700],
  borderSubtle: colors.charcoal[700],
  borderStrong: colors.charcoal[600],
  borderMuted: colors.charcoal[600],

  // Primary accent — Soft Blue
  primary: '#8ab4f8',
  primaryHover: '#a8c8fa',
  primaryStrong: '#6d9bdb',
  primaryMuted: '#5a87c7',
  primarySoft: `rgba(138, 180, 248, 0.15)`,
  primaryGlow: `rgba(138, 180, 248, 0.3)`,

  // Secondary accent — Muted Steel
  accent: '#94a3b8',
  accentHover: '#b0bec5',
  accentSoft: `rgba(148, 163, 184, 0.15)`,

  // Warm accent — White-ish
  warm: '#e0e0e0',
  warmHover: '#f0f0f0',
  warmSoft: `rgba(224, 224, 224, 0.15)`,

  // Status — Teal / Muted Red / Softer Amber
  success: '#2dd4bf',
  successHover: '#5eead4',
  successSoft: `rgba(45, 212, 191, 0.15)`,

  warning: '#dda832',
  warningHover: '#e8c060',
  warningSoft: `rgba(221, 168, 50, 0.15)`,

  error: '#d45454',
  errorHover: '#e07070',
  errorSoft: `rgba(212, 84, 84, 0.15)`,

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',
} as const;

// =============================================================================
// SEMANTIC TOKENS (Light Theme)
// =============================================================================

export const semanticLight = {
  // Backgrounds
  background: colors.slate[100],
  backgroundAlt: colors.slate[50],
  backgroundDeep: colors.slate[200],

  // Surfaces
  surface: colors.white,
  surfaceHover: colors.slate[50],
  surfaceActive: colors.slate[100],
  surfaceStrong: colors.slate[200],
  surfaceMuted: colors.slate[100],

  // Text
  text: colors.slate[900],
  textPrimary: colors.slate[900],
  textSecondary: colors.slate[600],
  textTertiary: colors.slate[500],
  textMuted: colors.slate[400],

  // Borders
  border: colors.slate[200],
  borderSubtle: colors.slate[200],
  borderStrong: colors.slate[300],
  borderMuted: colors.slate[200],

  // Primary accent
  primary: colors.indigo[600],
  primaryHover: colors.indigo[500],
  primaryStrong: colors.indigo[700],
  primaryMuted: colors.indigo[400],
  primarySoft: `rgba(79, 70, 229, 0.1)`,
  primaryGlow: `rgba(79, 70, 229, 0.2)`,

  // Secondary accent
  accent: colors.cyan[600],
  accentHover: colors.cyan[500],
  accentSoft: `rgba(8, 145, 178, 0.1)`,

  // Warm accent
  warm: colors.amber[600],
  warmHover: colors.amber[500],
  warmSoft: `rgba(217, 119, 6, 0.1)`,

  // Status
  success: colors.emerald[600],
  successHover: colors.emerald[500],
  successSoft: `rgba(5, 150, 105, 0.1)`,

  warning: colors.amber[600],
  warningHover: colors.amber[500],
  warningSoft: `rgba(217, 119, 6, 0.1)`,

  error: colors.rose[600],
  errorHover: colors.rose[500],
  errorSoft: `rgba(225, 29, 72, 0.1)`,

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.3)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
  overlayStrong: 'rgba(0, 0, 0, 0.5)',
} as const;

// Export all tokens
export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  dark: semanticDark,
  light: semanticLight,
} as const;

export type DesignTokens = typeof tokens;
export type Colors = typeof colors;
export type SemanticDark = typeof semanticDark;
export type SemanticLight = typeof semanticLight;
