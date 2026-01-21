/**
 * @repo/design-system
 *
 * Shared design system for epox-monorepo applications
 * Provides consistent design tokens, themes, and utilities
 */

export * from './tokens';
export { default as tailwindPreset } from './tailwind-preset';

// Re-export commonly used items
export {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  semanticDark,
  semanticLight,
  tokens,
} from './tokens';
