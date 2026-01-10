/**
 * Common inline styles for the application
 * Centralized style definitions to avoid Tailwind
 */

/**
 * Z-Index constants for consistent layering across the app
 * These values ensure proper stacking order for all overlays
 */
export const Z_INDEX = {
  /** Base navigation drawer */
  DRAWER: 100,
  /** Drawer backdrop/overlay */
  DRAWER_BACKDROP: 90,
  /** Standard modals (ImageModal, EditModal, etc.) */
  MODAL: 9000,
  /** Modal backdrop/overlay */
  MODAL_BACKDROP: 8999,
  /** Tooltips and popovers */
  TOOLTIP: 9500,
  /** Bottom drawers */
  BOTTOM_DRAWER: 9100,
  /** Bottom drawer backdrop */
  BOTTOM_DRAWER_BACKDROP: 9099,
  /** Toast notifications */
  TOAST: 9900,
} as const;

// Updated color palette matching the dark theme (charcoal tones)
export const colors = {
  // Neutral grays - charcoal tones for dark theme
  slate: {
    950: '#0f0f0f', // Deepest background
    900: '#171717', // Main background / input bg
    850: '#1a1a1a', // App background
    800: '#262626', // Card/surface background
    750: '#2a2a2a', // Elevated surfaces
    700: '#333333', // Borders, strong surfaces
    600: '#404040', // Muted borders
    500: '#525252', // Disabled state
    400: '#737373', // Muted text
    300: '#a3a3a3', // Secondary text
    200: '#d4d4d4', // Primary text
    100: '#e5e5e5', // Bright text
    50: '#f5f5f5',  // White-ish
  },
  // Vibrant indigo/purple for primary actions
  indigo: {
    700: '#4338ca',
    600: '#4f46e5',
    500: '#6366f1',
    400: '#818cf8',
    300: '#a5b4fc',
  },
  // Vibrant cyan/teal for accents
  cyan: {
    700: '#0e7490',
    600: '#0891b2',
    500: '#06b6d4',
    400: '#22d3ee',
    300: '#67e8f9',
  },
  // Vibrant red for errors/danger
  red: {
    700: '#b91c1c',
    600: '#dc2626',
    500: '#ef4444',
    400: '#f87171',
    300: '#fca5a5',
  },
  // Vibrant amber for warnings
  amber: {
    700: '#b45309',
    600: '#d97706',
    500: '#f59e0b',
    400: '#fcd34d',
  },
  // Vibrant green for success
  green: {
    700: '#15803d',
    600: '#16a34a',
    500: '#22c55e',
    400: '#4ade80',
    300: '#86efac',
  },
  emerald: {
    700: '#047857',
    600: '#059669',
  },
};

export const commonStyles = {
  button: {
    // Primary action button - vibrant indigo
    primary: {
      padding: '12px 24px',
      backgroundColor: colors.indigo[600],
      color: '#ffffff',
      borderRadius: '8px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,

    // Secondary/neutral button
    secondary: {
      padding: '12px 24px',
      backgroundColor: colors.slate[700],
      color: colors.slate[100],
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,

    // Success/confirm button - vibrant green
    success: {
      padding: '12px 24px',
      backgroundColor: colors.green[500],
      color: '#ffffff',
      borderRadius: '8px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,

    // Danger/delete button - vibrant red
    danger: {
      padding: '12px 24px',
      backgroundColor: colors.red[500],
      color: '#ffffff',
      borderRadius: '8px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,

    // Warning button - vibrant amber
    warning: {
      padding: '12px 24px',
      backgroundColor: colors.amber[500],
      color: '#0f0f0f',
      borderRadius: '8px',
      fontWeight: 500,
      transition: 'background-color 0.2s',
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,

    // Icon button
    icon: {
      padding: '8px',
      backgroundColor: colors.slate[800],
      color: colors.slate[300],
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,
  },

  input: {
    base: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: colors.slate[900],
      border: `1px solid ${colors.slate[600]}`,
      borderRadius: '8px',
      color: colors.slate[100],
      fontSize: '14px',
      outline: 'none',
    } as React.CSSProperties,

    textarea: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: colors.slate[900],
      border: `1px solid ${colors.slate[600]}`,
      borderRadius: '8px',
      color: colors.slate[100],
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical' as const,
      fontFamily: 'inherit',
    } as React.CSSProperties,
  },

  card: {
    base: {
      backgroundColor: colors.slate[800],
      borderRadius: '12px',
      padding: '16px',
    } as React.CSSProperties,

    border: {
      backgroundColor: colors.slate[800],
      border: `1px solid ${colors.slate[700]}`,
      borderRadius: '12px',
      padding: '16px',
    } as React.CSSProperties,
  },

  modal: {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: Z_INDEX.MODAL,
      padding: '16px',
      backdropFilter: 'blur(4px)',
    } as React.CSSProperties,

    content: {
      backgroundColor: colors.slate[800],
      borderRadius: '12px',
      width: '100%',
      maxWidth: '480px',
      border: `1px solid ${colors.slate[700]}`,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    } as React.CSSProperties,
  },

  // Text colors for consistency
  text: {
    primary: colors.slate[100],
    secondary: colors.slate[300],
    muted: colors.slate[400],
    inverse: colors.slate[950],
  },
};
