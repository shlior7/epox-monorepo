/**
 * API Route: Image Transform (Crop/Resize)
 * POST /api/image-transform
 *
 * Uses Sharp to crop or resize images to specific aspect ratios.
 */

import { NextResponse } from 'next/server';
import sharp from 'sharp';

interface CropArea {
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
}

interface TransformRequest {
  /** The image as a data URL */
  imageDataUrl: string;
  /** Operation type */
  operation: 'crop' | 'resize' | 'crop-interactive';
  /** Target aspect ratio (e.g., "16:9", "1:1", "1920:1080") - for crop/resize */
  aspectRatio?: string;
  /** For crop-interactive: the crop area as percentages */
  cropArea?: CropArea;
  /** For resize: how to fit the image ('cover' = fill, 'contain' = fit with padding) */
  fit?: 'cover' | 'contain';
  /** Background color for padding (default: transparent for PNG, white for JPEG) */
  background?: string;
}

interface TransformResponse {
  success: boolean;
  imageDataUrl?: string;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Parse aspect ratio string into width and height ratio values
 */
function parseAspectRatio(ratio: string): { w: number; h: number } {
  const [w, h] = ratio.split(':').map(Number);
  if (!w || !h || isNaN(w) || isNaN(h)) {
    throw new Error(`Invalid aspect ratio: ${ratio}`);
  }
  return { w, h };
}

/**
 * Convert base64 data URL to buffer
 */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  return {
    buffer: Buffer.from(matches[2], 'base64'),
    mimeType: matches[1],
  };
}

/**
 * Convert buffer to data URL
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(request: Request): Promise<NextResponse<TransformResponse>> {
  try {
    const body: TransformRequest = await request.json();

    // Validate request
    if (!body.imageDataUrl) {
      return NextResponse.json({ success: false, error: 'Missing imageDataUrl' }, { status: 400 });
    }

    if (!body.operation || !['crop', 'resize', 'crop-interactive'].includes(body.operation)) {
      return NextResponse.json({ success: false, error: 'Invalid operation' }, { status: 400 });
    }

    // For interactive crop, validate cropArea
    if (body.operation === 'crop-interactive') {
      if (!body.cropArea) {
        return NextResponse.json({ success: false, error: 'Missing cropArea for interactive crop' }, { status: 400 });
      }
      const { x, y, width, height } = body.cropArea;
      if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 100 || y + height > 100) {
        return NextResponse.json({ success: false, error: 'Invalid cropArea values' }, { status: 400 });
      }
    } else {
      // For regular crop/resize, validate aspectRatio
      if (!body.aspectRatio) {
        return NextResponse.json({ success: false, error: 'Missing aspectRatio' }, { status: 400 });
      }
    }

    // Parse input
    const { buffer, mimeType } = dataUrlToBuffer(body.imageDataUrl);

    // Get original image metadata
    const metadata = await sharp(buffer).metadata();
    const origWidth = metadata.width ?? 1024;
    const origHeight = metadata.height ?? 1024;

    let resultBuffer: Buffer;
    let finalWidth: number;
    let finalHeight: number;

    // Determine output format
    const outputFormat = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpeg';

    if (body.operation === 'crop-interactive') {
      // Interactive crop: use percentage-based cropArea
      const { x, y, width, height } = body.cropArea!;

      // Convert percentages to pixels
      const left = Math.round((x / 100) * origWidth);
      const top = Math.round((y / 100) * origHeight);
      const cropWidth = Math.round((width / 100) * origWidth);
      const cropHeight = Math.round((height / 100) * origHeight);

      // Ensure we don't exceed image bounds
      const safeWidth = Math.min(cropWidth, origWidth - left);
      const safeHeight = Math.min(cropHeight, origHeight - top);

      const sharpInstance = sharp(buffer).extract({
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: Math.max(1, safeWidth),
        height: Math.max(1, safeHeight),
      });

      if (outputFormat === 'png') {
        resultBuffer = await sharpInstance.png().toBuffer();
      } else if (outputFormat === 'webp') {
        resultBuffer = await sharpInstance.webp({ quality: 90 }).toBuffer();
      } else {
        resultBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
      }

      finalWidth = safeWidth;
      finalHeight = safeHeight;
    } else if (body.operation === 'crop') {
      // Center crop to target aspect ratio
      const { w: ratioW, h: ratioH } = parseAspectRatio(body.aspectRatio!);
      const targetRatio = ratioW / ratioH;
      const origRatio = origWidth / origHeight;
      let cropWidth: number;
      let cropHeight: number;

      if (origRatio > targetRatio) {
        // Image is wider than target - crop width
        cropHeight = origHeight;
        cropWidth = Math.round(origHeight * targetRatio);
      } else {
        // Image is taller than target - crop height
        cropWidth = origWidth;
        cropHeight = Math.round(origWidth / targetRatio);
      }

      // Center the crop
      const left = Math.round((origWidth - cropWidth) / 2);
      const top = Math.round((origHeight - cropHeight) / 2);

      const sharpInstance = sharp(buffer).extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      });

      if (outputFormat === 'png') {
        resultBuffer = await sharpInstance.png().toBuffer();
      } else if (outputFormat === 'webp') {
        resultBuffer = await sharpInstance.webp({ quality: 90 }).toBuffer();
      } else {
        resultBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
      }

      finalWidth = cropWidth;
      finalHeight = cropHeight;
    } else {
      // Resize to fit aspect ratio
      const { w: ratioW, h: ratioH } = parseAspectRatio(body.aspectRatio!);
      const targetRatio = ratioW / ratioH;
      const origRatio = origWidth / origHeight;
      const fit = body.fit || 'contain';

      if (fit === 'contain') {
        // Fit image within aspect ratio, add padding
        let newWidth: number;
        let newHeight: number;

        if (origRatio > targetRatio) {
          // Image is wider - fit to width, pad height
          newWidth = origWidth;
          newHeight = Math.round(origWidth / targetRatio);
        } else {
          // Image is taller - fit to height, pad width
          newHeight = origHeight;
          newWidth = Math.round(origHeight * targetRatio);
        }

        // Background color
        const bgColor = body.background || (outputFormat === 'png' ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255 });

        const sharpInstance = sharp(buffer)
          .resize(newWidth, newHeight, {
            fit: 'contain',
            background: typeof bgColor === 'string' ? bgColor : bgColor,
          });

        if (outputFormat === 'png') {
          resultBuffer = await sharpInstance.png().toBuffer();
        } else if (outputFormat === 'webp') {
          resultBuffer = await sharpInstance.webp({ quality: 90 }).toBuffer();
        } else {
          resultBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
        }

        finalWidth = newWidth;
        finalHeight = newHeight;
      } else {
        // Cover - fill aspect ratio, crop excess
        let newWidth: number;
        let newHeight: number;

        if (origRatio > targetRatio) {
          newHeight = origHeight;
          newWidth = Math.round(origHeight * targetRatio);
        } else {
          newWidth = origWidth;
          newHeight = Math.round(origWidth / targetRatio);
        }

        const sharpInstance = sharp(buffer).resize(newWidth, newHeight, {
          fit: 'cover',
          position: 'center',
        });

        if (outputFormat === 'png') {
          resultBuffer = await sharpInstance.png().toBuffer();
        } else if (outputFormat === 'webp') {
          resultBuffer = await sharpInstance.webp({ quality: 90 }).toBuffer();
        } else {
          resultBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
        }

        finalWidth = newWidth;
        finalHeight = newHeight;
      }
    }

    // Convert back to data URL
    const resultDataUrl = bufferToDataUrl(resultBuffer, mimeType);

    return NextResponse.json({
      success: true,
      imageDataUrl: resultDataUrl,
      width: finalWidth,
      height: finalHeight,
    });
  } catch (error) {
    console.error('Image transform failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transform image',
      },
      { status: 500 }
    );
  }
}
