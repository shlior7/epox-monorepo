/**
 * API Route: Generate images using PostgreSQL job queue
 * POST /api/generate-images
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { buildFullGenerationPrompt } from '@/lib/services/prompt-builder';
import type { PromptTags } from '@/lib/types';
import { withGenerationSecurity, validateUrls } from '@/lib/security';

// Flexible input that accepts strings or arrays
interface FlexiblePromptTags {
  sceneType?: string | string[];
  mood?: string | string[];
  lighting?: string | string[];
  style?: string | string[];
  custom?: string | string[];
  [key: string]: string | string[] | undefined;
}

// Note: clientId is NOT accepted from request body for security reasons
// It is always derived from the authenticated session
interface GenerateImagesRequest {
  sessionId: string;
  productIds: string[];
  promptTags?: FlexiblePromptTags;
  prompt?: string;
  /** Selected base image URLs (one per product) */
  productImageUrls?: string[];
  inspirationImageUrls?: string[];
  settings?: {
    aspectRatio?: string;
    imageQuality?: '1k' | '2k' | '4k';
    variantsPerProduct?: number;
  };
  urgent?: boolean;
}

/**
 * Normalize flexible prompt tags to the expected format
 */
function normalizePromptTags(input?: FlexiblePromptTags): PromptTags {
  const toArray = (val: string | string[] | undefined): string[] => {
    if (!val) {
      return [];
    }
    return Array.isArray(val) ? val : [val];
  };

  const tags: PromptTags = {
    sceneType: toArray(input?.sceneType),
    mood: toArray(input?.mood),
    lighting: toArray(input?.lighting),
    style: toArray(input?.style),
    custom: toArray(input?.custom),
  };

  // Handle extra keys
  if (input) {
    const knownKeys = ['sceneType', 'mood', 'lighting', 'style', 'custom'];
    for (const [key, value] of Object.entries(input)) {
      if (!knownKeys.includes(key) && value) {
        const vals = toArray(value);
        tags.custom.push(...vals.map((v) => `${key}: ${v}`));
      }
    }
  }

  return tags;
}

export const POST = withGenerationSecurity(async (request, context) => {
  const clientId = context.clientId!;

  const body: GenerateImagesRequest = await request.json();
  const {
    sessionId,
    productIds,
    promptTags,
    settings,
    productImageUrls,
    inspirationImageUrls,
    urgent,
  } = body;

  // Validate required fields
  if (!sessionId || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameters: sessionId, productIds' },
      { status: 400 }
    );
  }

  // Validate image URLs for SSRF protection
  if (productImageUrls && productImageUrls.length > 0) {
    const urlValidation = validateUrls(productImageUrls, { allowDataUrls: true });
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid product image URLs', details: urlValidation.errors },
        { status: 400 }
      );
    }
  }

  if (inspirationImageUrls && inspirationImageUrls.length > 0) {
    const urlValidation = validateUrls(inspirationImageUrls, { allowDataUrls: true });
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid inspiration image URLs', details: urlValidation.errors },
        { status: 400 }
      );
    }
  }

  console.log('🚀 Starting image generation job');
  console.log('📋 Request:', {
    clientId,
    sessionId,
    productCount: productIds.length,
    promptTags,
  });

  // Build the prompt - always include system requirements, add user prompt to custom tags
  const normalizedTags = normalizePromptTags(promptTags);

  // If user provided a custom prompt, add it to the custom tags
  if (body.prompt?.trim()) {
    normalizedTags.custom.push(body.prompt.trim());
  }

  const prompt = buildFullGenerationPrompt('Product', normalizedTags);
  console.log('📝 Generated prompt:', `${prompt.substring(0, 200)}...`);
  if (body.prompt) {
    console.log('📝 User custom prompt included:', body.prompt);
  }

  const expectedImageCount = productIds.length * (settings?.variantsPerProduct ?? 4);

  // Create job in PostgreSQL queue
  const job = await db.generationJobs.create({
    clientId,
    type: 'image_generation',
    priority: urgent ? 50 : 100, // Lower number = higher priority
    flowId: sessionId, // sessionId is actually the generationFlowId from the studio
    payload: {
      prompt,
      productIds,
      sessionId,
      settings: {
        aspectRatio: settings?.aspectRatio,
        imageQuality: settings?.imageQuality,
        numberOfVariants: settings?.variantsPerProduct ?? 4,
      },
      promptTags: normalizedTags,
      customPrompt: body.prompt?.trim() ? body.prompt.trim() : undefined,
      productImageUrls,
      inspirationImageUrls,
      isClientSession: false,
    },
  });

  console.log('✅ Job created in PostgreSQL:', job.id);

  return NextResponse.json({
    jobId: job.id,
    jobIds: [job.id],
    status: 'queued',
    expectedImageCount,
    prompt: prompt.substring(0, 500),
    message: `Generation queued for ${productIds.length} products`,
    queueType: 'postgres',
  });
});
