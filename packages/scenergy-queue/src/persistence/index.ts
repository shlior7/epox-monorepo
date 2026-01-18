/**
 * Persistence Layer
 *
 * Saves generated images to R2 and creates DB records.
 */

import { storage, storagePaths } from 'visualizer-storage';
import { db } from 'visualizer-db';
import type { FlowGenerationSettings, ImageGenerationSettings } from 'visualizer-types';

export interface SaveImageParams {
  clientId: string;
  sessionId?: string;
  flowId?: string;
  /** Single product ID (legacy) */
  productId?: string;
  /** Multiple product IDs (for combined images) */
  productIds?: string[];
  prompt: string;
  jobId: string;
  base64Data: string; // data:image/png;base64,... or raw base64
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  settings?: FlowGenerationSettings | ImageGenerationSettings | Record<string, unknown>;
}

export interface SavedImage {
  id: string;
  url: string;
}

/**
 * Convert base64 to Buffer
 */
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } {
  if (base64.startsWith('data:')) {
    const matches = /^data:(.+);base64,(.+)$/.exec(base64);
    if (!matches) {throw new Error('Invalid base64 data URL');}
    return { buffer: Buffer.from(matches[2], 'base64'), mimeType: matches[1] };
  }
  return { buffer: Buffer.from(base64, 'base64'), mimeType: 'image/png' };
}

/**
 * Save generated image to R2 + DB
 */
export async function saveGeneratedImage(params: SaveImageParams): Promise<SavedImage> {
  const { clientId, sessionId, flowId, productId, productIds, prompt, jobId, base64Data, settings } = params;

  // Convert base64
  const { buffer, mimeType } = base64ToBuffer(base64Data);
  const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('jpeg') ? 'jpg' : 'png';

  // Use a placeholder ID - the DB will generate the real one
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const storagePath = flowId
    ? storagePaths.generationAsset(clientId, flowId, tempId, ext)
    : storagePaths.generationAsset(clientId, sessionId ?? 'direct', tempId, ext);

  // Upload to R2
  await storage.upload(storagePath, buffer, mimeType);

  // Get public URL
  const assetUrl = storage.getPublicUrl(storagePath);

  // Resolve productIds: prefer array, fall back to single productId
  const resolvedProductIds = productIds ?? (productId ? [productId] : undefined);

  // Create DB record (repository generates the ID)
  const asset = await db.generatedAssets.create({
    clientId,
    generationFlowId: flowId,
    chatSessionId: sessionId,
    assetUrl,
    assetType: 'image',
    status: 'completed',
    prompt,
    settings: settings as FlowGenerationSettings | undefined,
    productIds: resolvedProductIds,
    jobId,
    completedAt: new Date(),
  });

  return { id: asset.id, url: assetUrl };
}

/**
 * Save multiple images (with parallel batching)
 */
export async function saveGeneratedImages(
  images: SaveImageParams[]
): Promise<SavedImage[]> {
  const BATCH_SIZE = 5;
  const results: SavedImage[] = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(saveGeneratedImage));
    results.push(...batchResults);
  }

  return results;
}
