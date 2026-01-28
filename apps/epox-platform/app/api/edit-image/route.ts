/**
 * API Route: Enqueue image edit job
 * Takes a base image and edit prompt, queues job for processing
 * Returns jobId for client polling
 *
 * Images are uploaded to temporary R2 storage to avoid large job payloads.
 * Cleanup happens when the edit session is saved or cancelled.
 */

import { NextResponse } from 'next/server';
import { enqueueImageEdit } from 'visualizer-ai';
import { storage, storagePaths } from 'visualizer-storage';
import { withGenerationSecurity, validateImageUrl } from '@/lib/security';
import { logJobStarted, logger } from '@/lib/logger';
import { enforceQuota, consumeCredits } from '@/lib/services/quota';

export interface EditImageApiRequest {
  /** Base64 data URL of the image to edit */
  baseImageDataUrl: string;
  /** Edit instructions */
  prompt: string;
  /** Edit session ID for grouping temp files */
  editSessionId: string;
  /** Optional product ID for context */
  productId?: string;
  /** Optional source asset ID for tracking */
  sourceAssetId?: string;
  /** Reference images for component editing */
  referenceImages?: Array<{ url: string; componentName: string }>;
}

/**
 * Convert base64 data URL to buffer
 */
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } {
  if (base64.startsWith('data:')) {
    const matches = /^data:(.+);base64,(.+)$/.exec(base64);
    if (!matches) {
      throw new Error('Invalid base64 data URL');
    }
    return { buffer: Buffer.from(matches[2], 'base64'), mimeType: matches[1] };
  }
  return { buffer: Buffer.from(base64, 'base64'), mimeType: 'image/png' };
}

interface EditImageResponse {
  success: boolean;
  jobId?: string;
  status?: 'queued';
  expectedImageId?: string;
  message?: string;
  error?: string;
}

/**
 * Extract aspect ratio from a data URL image
 * Returns format like "16:9", "4:3", "1:1", etc.
 */
function extractAspectRatioFromDataUrl(dataUrl: string): string {
  // Default to 1:1 if we can't determine
  const defaultRatio = '1:1';

  try {
    // For now, we'll use a simple approach - the worker will calculate the actual ratio
    // from the image dimensions when processing
    // This is a placeholder that the worker will override
    return defaultRatio;
  } catch {
    return defaultRatio;
  }
}

// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';

// Allow longer execution for large image uploads
export const maxDuration = 30;

export const POST = withGenerationSecurity(
  async (request, context): Promise<NextResponse<EditImageResponse>> => {
    const clientId = context.clientId;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const body: EditImageApiRequest = await request.json();

      // Validate required fields
      if (!body.baseImageDataUrl) {
        return NextResponse.json(
          { success: false, error: 'Missing baseImageDataUrl' },
          { status: 400 }
        );
      }
      if (!body.prompt) {
        return NextResponse.json({ success: false, error: 'Missing prompt' }, { status: 400 });
      }

      // Log the incoming request
      const urlLength = body.baseImageDataUrl?.length ?? 0;
      const urlPrefix = body.baseImageDataUrl?.substring(0, 100) ?? '';
      const isDataUrl = body.baseImageDataUrl?.startsWith('data:');
      const hasBase64 = body.baseImageDataUrl?.includes(';base64,');

      logger.info(
        {
          clientId,
          urlLength,
          isDataUrl,
          hasBase64,
          promptLength: body.prompt.length,
        },
        '[edit-image] Received edit request'
      );

      // Validate data URL format
      const urlValidation = validateImageUrl(body.baseImageDataUrl);
      if (!urlValidation.valid) {
        logger.error(
          {
            error: urlValidation.error,
            urlLength,
            urlPrefix,
            isDataUrl,
            hasBase64,
          },
          '[edit-image] Image URL validation failed'
        );
        return NextResponse.json(
          { success: false, error: urlValidation.error ?? 'Invalid image data URL' },
          { status: 400 }
        );
      }

      // Validate editSessionId is provided
      if (!body.editSessionId) {
        return NextResponse.json(
          { success: false, error: 'Missing editSessionId' },
          { status: 400 }
        );
      }

      // Enforce quota before processing
      const quotaDenied = await enforceQuota(clientId, 1);
      if (quotaDenied) return quotaDenied as NextResponse<EditImageResponse>;

      // Extract aspect ratio from the image (will be preserved in output)
      const aspectRatio = extractAspectRatioFromDataUrl(body.baseImageDataUrl);

      // Upload base image to R2 temp storage to avoid large job payloads
      const { buffer, mimeType } = base64ToBuffer(body.baseImageDataUrl);
      const baseImageKey = storagePaths.editSessionBase(clientId, body.editSessionId);

      await storage.upload(baseImageKey, buffer, mimeType);
      const baseImageR2Url = storage.getPublicUrl(baseImageKey);

      logger.info(
        { clientId, editSessionId: body.editSessionId, baseImageKey },
        '[edit-image] Uploaded base image to R2 temp storage'
      );

      // Enqueue the image edit job with R2 URL (not data URL)
      // Note: flowId is intentionally omitted for standalone edits (no FK constraint)
      const { jobId, expectedImageId } = await enqueueImageEdit(
        clientId,
        {
          sourceImageUrl: baseImageR2Url, // R2 URL instead of data URL
          editPrompt: body.prompt,
          sessionId: body.editSessionId,
          productId: body.productId,
          sourceAssetId: body.sourceAssetId,
          referenceImages: body.referenceImages,
          aspectRatio,
          settings: {
            imageQuality: '2k', // Always output in 2K quality
          },
          previewOnly: true, // Return R2 URL for preview (not saved permanently)
          tempStoragePrefix: storagePaths.editSessionPrefix(clientId, body.editSessionId),
        },
        {
          priority: 100,
          // No flowId - standalone edits don't belong to a generation flow
        }
      );

      logJobStarted(jobId, {
        clientId,
        sessionId: body.editSessionId,
        type: 'image_edit',
        aspectRatio,
      });

      // Consume credits after successful enqueue
      await consumeCredits(clientId, 1);

      logger.info({ jobId, expectedImageId, clientId }, '[edit-image] Job queued successfully');

      return NextResponse.json({
        success: true,
        jobId,
        status: 'queued',
        expectedImageId,
        message: 'Image edit job queued for processing',
      });
    } catch (error) {
      logger.error({ error }, '[edit-image] Failed to queue job');
      return NextResponse.json(
        { success: false, error: 'Failed to queue image edit job' },
        { status: 500 }
      );
    }
  }
);
