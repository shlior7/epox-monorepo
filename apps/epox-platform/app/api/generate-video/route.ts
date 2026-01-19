/**
 * API Route: Generate video using PostgreSQL job queue
 * POST /api/generate-video
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/services/db';
import { withGenerationSecurity, isValidUrl } from '@/lib/security';

// URL validation using centralized security module
const validateImageUrlField = (val: string) => isValidUrl(val, { allowDataUrls: true });

// Zod schema for request validation
const GenerateVideoRequestSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  productId: z.string().min(1, 'productId is required'),
  sourceImageUrl: z.string().min(1, 'sourceImageUrl is required').refine(validateImageUrlField, {
    message: 'sourceImageUrl must be a valid http/https URL or data URL',
  }),
  prompt: z
    .string()
    .min(1, 'prompt is required')
    .transform((s) => s.trim()),
  inspirationImageUrl: z
    .string()
    .refine((val) => !val || validateImageUrlField(val), {
      message: 'inspirationImageUrl must be a valid http/https URL or data URL',
    })
    .optional(),
  inspirationNote: z.string().optional(),
  settings: z
    .object({
      durationSeconds: z.number().positive().optional(),
      fps: z.number().positive().optional(),
      model: z.string().optional(),
    })
    .optional(),
  urgent: z.boolean().optional(),
});

type GenerateVideoRequest = z.infer<typeof GenerateVideoRequestSchema>;

/**
 * POST /api/generate-video
 *
 * Protected by security middleware:
 * - Authentication required
 * - Rate limited (generation tier)
 * - Request logging
 */
export const POST = withGenerationSecurity(async (request, context) => {
  // clientId is guaranteed non-null by withGenerationSecurity (requireAuth: true)
  const clientId = context.clientId!;

  // Parse JSON with explicit error handling
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
    }
    throw parseError;
  }

  // Validate request body with Zod
  const parseResult = GenerateVideoRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const body: GenerateVideoRequest = parseResult.data;
  const {
    sessionId,
    productId,
    sourceImageUrl,
    prompt,
    inspirationImageUrl,
    inspirationNote,
    settings,
    urgent,
  } = body;

  const job = await db.generationJobs.create({
    clientId,
    type: 'video_generation',
    priority: urgent ? 50 : 100,
    flowId: sessionId,
    payload: {
      prompt,
      sourceImageUrl,
      sessionId,
      productIds: [productId],
      inspirationImageUrl,
      inspirationNote,
      settings: settings ? { ...settings } : undefined,
    },
  });

  return NextResponse.json({
    jobId: job.id,
    status: 'queued',
    message: 'Video generation queued',
    queueType: 'postgres',
  });
});
