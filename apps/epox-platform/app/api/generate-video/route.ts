/**
 * API Route: Generate video using PostgreSQL job queue
 * POST /api/generate-video
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/services/db';
import { getClientId } from '@/lib/services/get-auth';

// Allowed URL protocols for image URLs
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Allowed domains for image URLs (exact matches only)
const ALLOWED_DOMAINS = [
  // Localhost for development
  'localhost',
  '127.0.0.1',
  // Common CDN and storage providers
  'storage.googleapis.com',
  'r2.cloudflarestorage.com',
  // Add your own domains here
];

// Pattern for Cloudflare R2 public bucket URLs (pub-{hash}.r2.dev)
const CLOUDFLARE_R2_PATTERN = /^pub-[a-f0-9]+\.r2\.dev$/;

// Strict data URL pattern for images (MIME type + base64)
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Validates an image URL - checks protocol and optionally domain
 */
function isValidImageUrl(urlString: string): boolean {
  // Validate data URLs with strict pattern
  if (urlString.startsWith('data:')) {
    return DATA_URL_PATTERN.test(urlString);
  }

  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return false;
    }

    // TODO:SECURITY-ENFORCE-DOMAIN-ALLOWLIST
    // Domain enforcement is currently disabled for development flexibility.
    // In production, enable domain allowlist enforcement by uncommenting below.
    // Decision needed: Should we enforce a domain allowlist and which domains/patterns?
    // Related: ALLOWED_DOMAINS, CLOUDFLARE_R2_PATTERN
    //
    // const isAllowedDomain = ALLOWED_DOMAINS.includes(url.hostname) ||
    //                         CLOUDFLARE_R2_PATTERN.test(url.hostname);
    // if (!isAllowedDomain) return false;

    return true;
  } catch {
    return false;
  }
}

// Zod schema for request validation
// Note: clientId is NOT accepted from the request body for security reasons
// It is always derived from the authenticated session
const GenerateVideoRequestSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  productId: z.string().min(1, 'productId is required'),
  sourceImageUrl: z.string().min(1, 'sourceImageUrl is required').refine(isValidImageUrl, {
    message: 'sourceImageUrl must be a valid http/https URL or data URL',
  }),
  prompt: z
    .string()
    .min(1, 'prompt is required')
    .transform((s) => s.trim()),
  inspirationImageUrl: z
    .string()
    .refine((val) => !val || isValidImageUrl(val), {
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

export async function POST(request: NextRequest) {
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

  try {
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

    // Always use authenticated client ID - never accept from request body
    const clientId = await getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
  } catch (error) {
    // Log full error server-side but return generic message to client
    console.error('❌ Failed to start video generation:', error);
    return NextResponse.json({ error: 'Failed to start video generation' }, { status: 500 });
  }
}
