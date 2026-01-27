/**
 * Professional image processing service using Sharp
 * Implements real tone curves, luminosity masks, and proper color science
 */

import sharp from 'sharp';
import type { PostAdjustments, LightAdjustments, ColorAdjustments, EffectsAdjustments } from '@/lib/types/app-types';
import { temperatureToRGB } from '@/lib/services/image-processing/adjustment-math';

interface RawImageData {
  data: Buffer;
  info: sharp.OutputInfo;
}

/**
 * Apply full adjustment stack to image
 * Returns base64 data URL
 */
export async function applyAdjustments(imageDataUrl: string, adjustments: PostAdjustments): Promise<string> {
  console.log('🎨 Starting image processing with Sharp...');
  const startTime = Date.now();

  // Convert data URL to buffer
  const buffer = dataUrlToBuffer(imageDataUrl);

  let pipeline = sharp(buffer);

  // Get image metadata for later use
  const metadata = await pipeline.metadata();
  const width = metadata.width || 1;
  const height = metadata.height || 1;
  const channels = metadata.channels || 3;

  // 1. LIGHT ADJUSTMENTS (order matters!)
  pipeline = await applyLightAdjustments(pipeline, adjustments.light, width, height, channels);

  // 2. COLOR ADJUSTMENTS
  pipeline = await applyColorAdjustments(pipeline, adjustments.color, width, height, channels);

  // 3. EFFECTS (last, to work on final tones)
  pipeline = await applyEffects(pipeline, adjustments.effects);

  // Export at high quality
  const processed = await pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();

  const duration = Date.now() - startTime;
  console.log(`✅ Image processing completed in ${duration}ms`);

  return bufferToDataUrl(processed, 'image/jpeg');
}

/**
 * Apply light adjustments using tone curves and luminosity masks
 */
async function applyLightAdjustments(
  pipeline: sharp.Sharp,
  light: LightAdjustments,
  width: number,
  height: number,
  channels: number
): Promise<sharp.Sharp> {
  const { exposure, contrast, highlights, shadows, whites, blacks } = light;

  // Skip if no light adjustments
  if (exposure === 0 && contrast === 0 && highlights === 0 && shadows === 0 && whites === 0 && blacks === 0) {
    return pipeline;
  }

  // Exposure: Linear brightness adjustment using shared function
  // At +100: 4x brighter, at -100: 0.25x darker
  if (exposure !== 0) {
    const multiplier = Math.pow(2, exposure / 50); // More aggressive: +100 = 4x
    pipeline = pipeline.linear(multiplier, 0);
  }

  // Contrast: S-curve via linear transformation
  // At +100: 3x contrast, at -100: flat gray
  if (contrast !== 0) {
    const contrastFactor = contrast >= 0 ? 1 + contrast / 50 : 1 + contrast / 100;
    pipeline = pipeline.linear(contrastFactor, (1 - contrastFactor) * 128);
  }

  // Highlights/Shadows/Whites/Blacks: Luminosity-based selective adjustments
  // These require pixel-level processing with RAW buffer access
  if (highlights !== 0 || shadows !== 0 || whites !== 0 || blacks !== 0) {
    const rawData = await pipeline.raw().toBuffer({ resolveWithObject: true });
    const adjusted = applyLuminosityMasks(rawData, { highlights, shadows, whites, blacks });
    pipeline = sharp(adjusted.data, {
      raw: {
        width: adjusted.info.width,
        height: adjusted.info.height,
        channels: adjusted.info.channels as 3 | 4,
      },
    });
  }

  return pipeline;
}

/**
 * Apply color adjustments
 */
async function applyColorAdjustments(
  pipeline: sharp.Sharp,
  color: ColorAdjustments,
  width: number,
  height: number,
  channels: number
): Promise<sharp.Sharp> {
  const { temperature, vibrance, saturation } = color;

  // Skip if no color adjustments
  if (temperature === 0 && vibrance === 0 && saturation === 0) {
    return pipeline;
  }

  // Temperature: True color science using color matrix
  if (temperature !== 0) {
    const { r, g, b } = temperatureToRGB(temperature);
    // Apply color temperature via recomb matrix
    pipeline = pipeline.recomb([
      [r, 0, 0],
      [0, g, 0],
      [0, 0, b],
    ]);
  }

  // Saturation: Global saturation via modulate
  if (saturation !== 0) {
    const satValue = 1 + saturation / 100;
    pipeline = pipeline.modulate({ saturation: satValue });
  }

  // Vibrance: Smart saturation (only affects less-saturated colors)
  // Requires pixel-level processing
  if (vibrance !== 0) {
    const rawData = await pipeline.raw().toBuffer({ resolveWithObject: true });
    const adjusted = applyVibrance(rawData, vibrance);
    pipeline = sharp(adjusted.data, {
      raw: {
        width: adjusted.info.width,
        height: adjusted.info.height,
        channels: adjusted.info.channels as 3 | 4,
      },
    });
  }

  return pipeline;
}

/**
 * Apply effects (texture, clarity, sharpness)
 */
async function applyEffects(pipeline: sharp.Sharp, effects: EffectsAdjustments): Promise<sharp.Sharp> {
  const { texture, clarity, sharpness } = effects;

  // Skip if no effects
  if (texture === 0 && clarity === 0 && sharpness === 0) {
    return pipeline;
  }

  // Sharpness: Unsharp mask (professional standard)
  if (sharpness > 0) {
    const sigma = 0.5 + sharpness / 50; // 0.5-2.5 range
    pipeline = pipeline.sharpen({ sigma });
  }

  // Clarity: Local contrast enhancement
  // Use unsharp mask with larger radius for local contrast
  if (clarity !== 0) {
    const sigma = 5; // Larger radius for clarity
    const amount = Math.abs(clarity) / 50;
    if (clarity > 0) {
      pipeline = pipeline.sharpen({ sigma, m1: amount, m2: amount });
    } else {
      // Negative clarity = blur slightly
      pipeline = pipeline.blur(Math.abs(clarity) / 50);
    }
  }

  // Texture: High-frequency detail enhancement
  // Very small sigma for fine detail
  if (texture !== 0) {
    const sigma = 0.3;
    const amount = Math.abs(texture) / 100;
    if (texture > 0) {
      pipeline = pipeline.sharpen({ sigma, m1: amount, m2: 0 });
    }
    // Negative texture = no action (can't easily reduce texture with Sharp)
  }

  return pipeline;
}

/**
 * Apply luminosity masks for selective tonal adjustments
 * This is the key for real highlights/shadows recovery
 */
function applyLuminosityMasks(
  rawData: RawImageData,
  masks: { highlights: number; shadows: number; whites: number; blacks: number }
): RawImageData {
  const { data, info } = rawData;
  const { width, height, channels } = info;

  // Create a copy of the buffer for modification
  const result = Buffer.from(data);

  // Process pixel by pixel
  for (let i = 0; i < result.length; i += channels) {
    const r = result[i];
    const g = result[i + 1];
    const b = result[i + 2];

    // Calculate luminosity (perceptual brightness)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const lumNorm = lum / 255; // 0-1 range

    // Create luminosity masks (these define which pixels are affected)
    // Highlights: bright areas (exponential curve for smooth transition)
    const highlightMask = Math.pow(lumNorm, 2);
    // Shadows: dark areas
    const shadowMask = Math.pow(1 - lumNorm, 2);
    // Whites: only the brightest areas
    const whiteMask = Math.pow(lumNorm, 4);
    // Blacks: only the darkest areas
    const blackMask = Math.pow(1 - lumNorm, 4);

    // Calculate adjustment amount
    // Highlights recovery (negative adjustment for overexposed areas)
    // Shadows lifting (positive adjustment for dark areas)
    // Coefficients tuned to match WebGL preview and provide gradual, natural adjustments
    const adjustment =
      masks.highlights * highlightMask * -0.25 +
      masks.shadows * shadowMask * 0.25 +
      masks.whites * whiteMask * -0.15 +
      masks.blacks * blackMask * 0.15;

    // Apply to each channel while preserving color ratios
    result[i] = clamp(r + adjustment);
    result[i + 1] = clamp(g + adjustment);
    result[i + 2] = clamp(b + adjustment);
    // Alpha channel (if present) unchanged
  }

  return { data: result, info };
}

/**
 * Apply vibrance (smart saturation)
 * Only affects colors that aren't already highly saturated
 * Preserves skin tones by not over-saturating already saturated colors
 */
function applyVibrance(rawData: RawImageData, vibrance: number): RawImageData {
  const { data, info } = rawData;
  const { channels } = info;

  // Create a copy of the buffer for modification
  const result = Buffer.from(data);
  const strength = vibrance / 100;

  for (let i = 0; i < result.length; i += channels) {
    const r = result[i] / 255;
    const g = result[i + 1] / 255;
    const b = result[i + 2] / 255;

    // Calculate current saturation (HSV model)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const currentSat = max === 0 ? 0 : (max - min) / max;

    // Apply vibrance only to less-saturated pixels
    // The less saturated, the more boost applied
    const vibranceMask = 1 - currentSat;
    const boost = 1 + strength * vibranceMask;

    // Apply selective saturation boost by moving colors away from gray
    const avg = (r + g + b) / 3;
    result[i] = clamp(((r - avg) * boost + avg) * 255);
    result[i + 1] = clamp(((g - avg) * boost + avg) * 255);
    result[i + 2] = clamp(((b - avg) * boost + avg) * 255);
    // Alpha channel (if present) unchanged
  }

  return { data: result, info };
}

/**
 * Clamp value to 0-255 range
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Convert data URL to Buffer
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Convert Buffer to data URL
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Check if any adjustments are non-default
 */
export function hasAdjustments(adjustments: PostAdjustments): boolean {
  const { light, color, effects } = adjustments;
  return (
    Object.values(light).some((v) => v !== 0) || Object.values(color).some((v) => v !== 0) || Object.values(effects).some((v) => v !== 0)
  );
}
