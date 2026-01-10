/**
 * GPU-accelerated preview using WebGL via glfx.js
 * Provides instant visual feedback (~60fps) while user adjusts sliders
 */

import type { PostAdjustments } from '@/lib/types/app-types';
import {
  buildNormalizedLinearCurvePoints,
  buildNormalizedLuminosityCurvePoints,
  temperatureToRGB,
} from '@/lib/services/image-processing/adjustment-math';

// glfx types
interface GlfxCanvas extends HTMLCanvasElement {
  texture(image: HTMLImageElement | HTMLCanvasElement): GlfxTexture;
  draw(texture: GlfxTexture, width?: number, height?: number): GlfxCanvas;
  update(): GlfxCanvas;
  brightnessContrast(brightness: number, contrast: number): GlfxCanvas;
  hueSaturation(hue: number, saturation: number): GlfxCanvas;
  vibrance(amount: number): GlfxCanvas;
  unsharpMask(radius: number, strength: number): GlfxCanvas;
  triangleBlur(radius: number): GlfxCanvas;
  curves(red: [number, number][], green?: [number, number][], blue?: [number, number][]): GlfxCanvas;
  _: {
    gl: WebGLRenderingContext;
  };
}

interface GlfxTexture {
  destroy(): void;
  loadContentsOf(image: HTMLImageElement | HTMLCanvasElement): void;
}

// Dynamic import for glfx (client-side only)
let fx: { canvas: () => GlfxCanvas } | null = null;

/**
 * WebGL Preview Service
 * Provides real-time preview of image adjustments using GPU acceleration
 */
export class WebGLPreviewService {
  private canvas: GlfxCanvas | null = null;
  private texture: GlfxTexture | null = null;
  private sourceImage: HTMLImageElement | null = null;
  private isInitialized = false;
  private initError: string | null = null;

  /**
   * Check if WebGL is supported
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Initialize WebGL context with an image
   */
  async init(image: HTMLImageElement): Promise<boolean> {
    if (typeof window === 'undefined') {
      this.initError = 'WebGL only available in browser';
      return false;
    }

    try {
      // Dynamically import glfx (client-side only)
      if (!fx) {
        const glfx = await import('glfx');
        fx = glfx.default || glfx;
      }

      // Check if we already have a valid canvas and texture
      if (this.canvas && this.texture) {
        try {
          // reuse the existing context and just swap the source image
          this.texture.loadContentsOf(image);
          this.sourceImage = image;
          console.log('🔄 WebGL texture updated (Context reused)');
          return true;
        } catch (e) {
          console.warn('Failed to reuse WebGL context, recreating...', e);
          // If swapping fails, destroy it and let the code below recreate it
          this.cleanup();
        }
      }

      // Create new context (First load only)
      if (!fx) throw new Error('glfx failed to load');

      this.canvas = fx.canvas();
      this.sourceImage = image;
      this.texture = this.canvas.texture(image);
      this.isInitialized = true;
      this.initError = null;

      console.log('✅ WebGL preview initialized (New Context)');
      return true;
    } catch (error) {
      console.warn('⚠️ WebGL not supported, falling back to CSS filters:', error);
      this.initError = error instanceof Error ? error.message : 'WebGL initialization failed';
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.canvas !== null && this.texture !== null;
  }

  /**
   * Get initialization error if any
   */
  getError(): string | null {
    return this.initError;
  }

  /**
   * Apply adjustments and render to canvas
   * Returns the canvas element for display
   */
  render(adjustments: PostAdjustments): HTMLCanvasElement | null {
    if (!this.canvas || !this.texture) {
      return null;
    }

    try {
      // Start with the original texture
      this.canvas.draw(this.texture);

      // Apply adjustments in order (similar to Sharp processor)
      this.applyLightAdjustments(adjustments.light);
      this.applyColorAdjustments(adjustments.color);
      this.applyEffectsAdjustments(adjustments.effects);

      // Update the canvas with the rendered result
      this.canvas.update();

      return this.canvas as HTMLCanvasElement;
    } catch (error) {
      console.error('WebGL render error:', error);
      return null;
    }
  }

  /**
   * Apply light adjustments (exposure, contrast, highlights, shadows)
   * Uses glfx's native brightnessContrast for exposure/contrast (more effective)
   * Uses normalized curves for tonal adjustments
   */
  private applyLightAdjustments(light: PostAdjustments['light']): void {
    if (!this.canvas) return;

    const { exposure, contrast, highlights, shadows, whites, blacks } = light;

    // Exposure/Contrast using glfx's native brightnessContrast function
    // This provides better results than curves which clamp values
    if (exposure !== 0 || contrast !== 0) {
      // glfx brightnessContrast expects values in -1 to 1 range
      // Map our -100 to 100 range to -1 to 1, with more aggressive scaling
      const brightness = exposure / 100; // -1 to 1
      const contrastVal = contrast / 100; // -1 to 1
      this.canvas.brightnessContrast(brightness, contrastVal);
    }

    // Highlights/Shadows/Whites/Blacks using tone curve approximation (normalized 0-1)
    if (highlights !== 0 || shadows !== 0 || whites !== 0 || blacks !== 0) {
      const curve = buildNormalizedLuminosityCurvePoints({ highlights, shadows, whites, blacks });
      this.canvas.curves(curve);
    }
  }

  /**
   * Apply color adjustments (temperature, vibrance, saturation)
   */
  private applyColorAdjustments(color: PostAdjustments['color']): void {
    if (!this.canvas) return;

    const { temperature, vibrance, saturation } = color;

    // Temperature first (matches Sharp order)
    if (temperature !== 0) {
      this.applyTemperature(temperature);
    }

    // Saturation via hueSaturation (hue = 0 for no hue shift)
    if (saturation !== 0) {
      const satVal = saturation / 100; // -1 to 1
      this.canvas.hueSaturation(0, satVal);
    }

    // Vibrance (smart saturation)
    if (vibrance !== 0) {
      const vibranceVal = vibrance / 100; // -1 to 1
      this.canvas.vibrance(vibranceVal);
    }
  }

  /**
   * Apply effects (sharpness, clarity, texture)
   */
  private applyEffectsAdjustments(effects: PostAdjustments['effects']): void {
    if (!this.canvas) return;

    const { sharpness, clarity, texture } = effects;

    // Sharpness via unsharp mask (align radius with Sharp sigma range)
    if (sharpness > 0) {
      const radius = 0.5 + sharpness / 50; // 0.5-2.5
      const strength = sharpness / 100; // 0-1
      this.canvas.unsharpMask(radius, strength);
    }

    // Clarity: local contrast enhancement or blur when negative
    if (clarity !== 0) {
      const strength = Math.abs(clarity) / 50; // 0-2
      if (clarity > 0) {
        const radius = 5;
        this.canvas.unsharpMask(radius, strength);
      } else {
        const radius = Math.max(0.1, Math.abs(clarity) / 50);
        this.canvas.triangleBlur(radius);
      }
    }

    // Texture - fine detail sharpening (positive only, like Sharp)
    if (texture > 0) {
      const radius = 0.3;
      const strength = texture / 100;
      this.canvas.unsharpMask(radius, strength);
    }
  }

  /**
   * Apply color temperature using RGB curves
   * Uses normalized 0-1 curve values for glfx.js WebGL
   */
  private applyTemperature(temperature: number): void {
    if (!this.canvas) return;

    const { r, g, b } = temperatureToRGB(temperature);
    // For temperature, intercept is 0, just apply channel multipliers as normalized curves
    const redCurve = buildNormalizedLinearCurvePoints(r, 0);
    const greenCurve = buildNormalizedLinearCurvePoints(g, 0);
    const blueCurve = buildNormalizedLinearCurvePoints(b, 0);

    this.canvas.curves(redCurve, greenCurve, blueCurve);
  }

  /**
   * Update the source image (e.g., when switching revisions)
   */
  updateImage(image: HTMLImageElement): boolean {
    if (!this.texture) {
      return false;
    }

    try {
      this.texture.loadContentsOf(image);
      this.sourceImage = image;
      return true;
    } catch (error) {
      console.error('Failed to update WebGL texture:', error);
      return false;
    }
  }

  /**
   * Get the canvas element for rendering
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Cleanup WebGL resources
   */
  cleanup(): void {
    if (this.texture) {
      try {
        this.texture.destroy();
      } catch {
        // Ignore cleanup errors
      }
      this.texture = null;
    }

    if (this.canvas) {
      try {
        const gl = this.canvas._.gl;
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
      } catch {
        // Ignore cleanup errors
      }
      this.canvas = null;
    }

    this.sourceImage = null;
    this.isInitialized = false;
    console.log('🧹 WebGL preview cleaned up');
  }
}

/**
 * Singleton instance for easy access
 */
let previewService: WebGLPreviewService | null = null;

export function getWebGLPreviewService(): WebGLPreviewService {
  if (!previewService) {
    previewService = new WebGLPreviewService();
  }
  return previewService;
}

export function cleanupWebGLPreviewService(): void {
  if (previewService) {
    previewService.cleanup();
    previewService = null;
  }
}
