import type { LightAdjustments } from '@/lib/types/app-types';

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Convert exposure value (-100 to 100) to brightness multiplier.
 * More aggressive curve for visible effect like typical brightness sliders:
 * - exposure = 0: multiplier = 1 (no change)
 * - exposure = 100: multiplier = 4 (4x brighter)
 * - exposure = -100: multiplier = 0.25 (4x darker)
 */
export function exposureToMultiplier(exposure: number): number {
  return Math.pow(2, exposure / 50);
}

/**
 * Convert contrast value (-100 to 100) to contrast factor.
 * More aggressive for visible effect like typical contrast sliders:
 * - contrast = 0: factor = 1 (no change)
 * - contrast = 100: factor = 3 (strong contrast)
 * - contrast = -100: factor = 0 (flat gray)
 */
export function contrastToFactor(contrast: number): number {
  // Use a curve that's more aggressive in the positive direction
  if (contrast >= 0) {
    return 1 + contrast / 50; // 0 to 3
  } else {
    return 1 + contrast / 100; // 1 to 0
  }
}

export function temperatureToRGB(temp: number): { r: number; g: number; b: number } {
  const kelvin = 5500 - temp * 20;

  let r: number;
  let g: number;
  let b: number;

  if (kelvin <= 6600) {
    r = 1;
    g = 0.39 * Math.log(kelvin / 100) - 0.634;
    b = kelvin <= 1900 ? 0 : 0.543 * Math.log(kelvin / 100 - 10) - 1.185;
  } else {
    r = 1.29 * Math.pow(kelvin / 100 - 60, -0.1332);
    g = 1.13 * Math.pow(kelvin / 100 - 60, -0.0755);
    b = 1;
  }

  r = Math.max(0.5, Math.min(1.5, r));
  g = Math.max(0.5, Math.min(1.5, g));
  b = Math.max(0.5, Math.min(1.5, b));

  const maxChannel = Math.max(r, g, b);
  return {
    r: r / maxChannel,
    g: g / maxChannel,
    b: b / maxChannel,
  };
}

/**
 * Calculate luminosity adjustment based on masks for highlights/shadows/whites/blacks.
 * Coefficients are tuned to match Lightroom-like behavior:
 * - Gentle, gradual adjustments even at extreme slider values
 * - shadows/blacks LIFT dark areas (add brightness)
 * - highlights/whites REDUCE bright areas (recover detail)
 */
export function calculateLuminosityAdjustment(
  lum: number,
  masks: Pick<LightAdjustments, 'highlights' | 'shadows' | 'whites' | 'blacks'>
): number {
  const lumNorm = lum / 255;

  // Soft masks using power curves for smooth transitions
  const highlightMask = Math.pow(lumNorm, 2);
  const shadowMask = Math.pow(1 - lumNorm, 2);
  const whiteMask = Math.pow(lumNorm, 4);
  const blackMask = Math.pow(1 - lumNorm, 4);

  // Coefficients tuned for natural, gradual adjustments:
  // - highlights/whites: negative coefficient (reduce brightness to recover detail)
  // - shadows/blacks: positive coefficient (lift to brighten dark areas)
  // Values scaled so full +100/-100 produces visible but not extreme changes
  return (
    masks.highlights * highlightMask * -0.25 + // Recover highlights
    masks.shadows * shadowMask * 0.25 + // Lift shadows
    masks.whites * whiteMask * -0.15 + // Recover whites
    masks.blacks * blackMask * 0.15 // Lift blacks
  );
}

export function buildLuminosityCurvePoints(
  light: Pick<LightAdjustments, 'highlights' | 'shadows' | 'whites' | 'blacks'>,
  sampleCount: number = 9
): [number, number][] {
  const samples = Math.max(2, Math.round(sampleCount));
  const step = 255 / (samples - 1);
  const points: [number, number][] = [];

  for (let i = 0; i < samples; i += 1) {
    const input = Math.round(i * step);
    const adjustment = calculateLuminosityAdjustment(input, light);
    points.push([input, clampByte(input + adjustment)]);
  }

  return points;
}

export function buildLinearCurvePoints(slope: number, intercept: number): [number, number][] {
  const start = clampByte(intercept);
  const end = clampByte(slope * 255 + intercept);
  return [
    [0, start],
    [255, end],
  ];
}

/**
 * Build normalized curve points for WebGL (glfx.js)
 * glfx curves() expects values in 0-1 range, not 0-255
 */
export function buildNormalizedLuminosityCurvePoints(
  light: Pick<LightAdjustments, 'highlights' | 'shadows' | 'whites' | 'blacks'>,
  sampleCount: number = 9
): [number, number][] {
  const samples = Math.max(2, Math.round(sampleCount));
  const step = 1 / (samples - 1);
  const points: [number, number][] = [];

  for (let i = 0; i < samples; i += 1) {
    const inputNorm = i * step;
    const input = inputNorm * 255;
    const adjustment = calculateLuminosityAdjustment(input, light);
    const outputNorm = Math.max(0, Math.min(1, (input + adjustment) / 255));
    points.push([inputNorm, outputNorm]);
  }

  return points;
}

/**
 * Build normalized linear curve points for WebGL (glfx.js)
 * glfx curves() expects values in 0-1 range, not 0-255
 */
export function buildNormalizedLinearCurvePoints(slope: number, intercept: number): [number, number][] {
  // intercept is in 0-255 range, normalize it
  const interceptNorm = intercept / 255;
  const startNorm = Math.max(0, Math.min(1, interceptNorm));
  const endNorm = Math.max(0, Math.min(1, slope * 1 + interceptNorm));
  return [
    [0, startNorm],
    [1, endNorm],
  ];
}
