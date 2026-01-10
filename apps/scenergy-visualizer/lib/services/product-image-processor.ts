/**
 * Product Image Processor Service
 * Handles GLB to images conversion with JPEG preview generation
 * Shared logic extracted from BulkAddProductsModal and AddBaseImagesModal
 */

export interface CameraDefaults {
  radius: number;
  minRadius: number;
  maxRadius: number;
}

export interface CameraSettings {
  alpha?: number;
  beta: number;
  radius?: number;
  fov?: number;
  defaults?: CameraDefaults;
}

export interface ProcessGLBResult {
  imageFiles: File[];
  jpegPreviews: string[];
}

export type ProgressCallback = (progress: number) => void;

const DEFAULT_BETA = Math.PI / 3;
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const JPEG_QUALITY = 0.95;
const NUM_VIEWS = 6;

/**
 * Process a GLB file into multiple PNG images with JPEG previews
 * Generates 6 views around the model from a specified camera angle
 *
 * @param file - GLB file to process
 * @param onProgress - Optional callback for progress updates (0-100)
 * @param camera - Optional camera settings (beta angle, radius)
 * @returns Object containing PNG image files and JPEG preview data URLs
 */
export async function processGLBToImages(file: File, onProgress?: ProgressCallback, camera?: CameraSettings): Promise<ProcessGLBResult> {
  onProgress?.(10);

  // Import the GLB renderer (client-side only)
  const { renderGLBToImages, dataUrlToFile, generateJpegPreview } = await import('./glb-renderer');
  const { v4: uuidv4 } = await import('uuid');

  console.log('🎨 Processing GLB file:', file.name);

  onProgress?.(20);

  // Convert GLB to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(30);

  // Render multiple views using Babylon.js
  console.log(`📸 Rendering ${NUM_VIEWS} views of the model...`);
  console.log('🎥 Camera settings:', {
    beta: camera?.beta !== undefined ? `${camera.beta.toFixed(3)} rad (${((camera.beta * 180) / Math.PI).toFixed(1)}°)` : 'undefined',
    radius: camera?.radius !== undefined ? camera.radius.toFixed(3) : 'undefined',
  });

  const renderedImages = await renderGLBToImages(arrayBuffer, {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: 'transparent',
    cameraBeta: camera?.beta,
    cameraRadius: camera?.radius,
  });

  console.log(`✅ Rendered ${renderedImages.length} images`);

  onProgress?.(60);

  // Convert data URLs to File objects and create previews
  const imageFiles: File[] = [];
  const jpegPreviews: string[] = [];

  for (let i = 0; i < renderedImages.length; i++) {
    const img = renderedImages[i];
    const imageId = uuidv4(); // Use UUID for unique identification

    // PNG file with transparency (for AI model) - will be uploaded to base/ folder
    // Store the UUID in the filename so we can extract it later
    const pngFile = dataUrlToFile(img.dataUrl, `${imageId}.png`);
    imageFiles.push(pngFile);

    // Generate JPEG preview with white background (for UI display)
    console.log(`🖼️  Generating JPEG preview for view ${i + 1}...`);
    const jpegPreview = await generateJpegPreview(img.dataUrl, JPEG_QUALITY);
    jpegPreviews.push(jpegPreview);
  }

  console.log(`✅ Generated ${imageFiles.length} PNG images and ${jpegPreviews.length} JPEG previews`);

  onProgress?.(75);

  return { imageFiles, jpegPreviews };
}

/**
 * Convert beta angle from radians to degrees
 */
export function betaToDegrees(betaRadians: number): number {
  return (betaRadians * 180) / Math.PI;
}

/**
 * Convert beta angle from degrees to radians
 */
export function betaToRadians(betaDegrees: number): number {
  return (betaDegrees * Math.PI) / 180;
}

/**
 * Validate camera settings
 */
export function validateCameraSettings(camera: CameraSettings): boolean {
  if (typeof camera.beta !== 'number' || !Number.isFinite(camera.beta)) {
    return false;
  }

  if (camera.radius !== undefined) {
    if (typeof camera.radius !== 'number' || !Number.isFinite(camera.radius) || camera.radius <= 0) {
      return false;
    }
  }

  return true;
}
