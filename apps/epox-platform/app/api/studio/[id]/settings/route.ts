/**
 * API Route: Update studio/generation flow settings
 * PATCH /api/studio/[id]/settings
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import { internalServerErrorResponse } from '@/lib/security/error-handling';
import type {
  FlowGenerationSettings,
  ImageAspectRatio,
  InspirationSection,
  BubbleValue,
} from 'visualizer-types';
import { normalizeImageQuality } from 'visualizer-types';

interface UpdateSettingsRequest {
  // Inspiration (Section 1)
  generalInspiration?: BubbleValue[];
  inspirationSections?: InspirationSection[];
  sceneType?: string; // Scene type selection

  // User Prompt (Section 3)
  userPrompt?: string;

  // Output Settings (Section 4)
  aspectRatio?: ImageAspectRatio;
  imageQuality?: '1k' | '2k' | '4k';
  variantsPerProduct?: number;
  video?: {
    prompt?: string;
    inspirationImageUrl?: string;
    inspirationNote?: string;
    settings?: {
      videoType?: string;
      cameraMotion?: string;
      aspectRatio?: '16:9' | '9:16';
      resolution?: '720p' | '1080p';
      sound?: 'with_music' | 'no_sound' | 'automatic' | 'custom';
      soundPrompt?: string;
    };
    presetId?: string | null;
  };

  // Selected base images (productId -> imageUrl)
  selectedBaseImages?: Record<string, string>;
}


// Force dynamic rendering since security middleware reads headers
export const dynamic = 'force-dynamic';
export const PATCH = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: flowId } = await params;
    const body: UpdateSettingsRequest = await request.json();

    console.log('📝 Updating studio settings:', { flowId, clientId, body });

    // Check if flow exists
    let flow = await db.generationFlows.getById(flowId);

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: flow.clientId,
        resourceType: 'generation-flow',
        resourceId: flowId,
      })
    ) {
      return forbiddenResponse();
    }

    // Update existing flow settings
    const settingsUpdate: Partial<FlowGenerationSettings> = {};

    // Inspiration settings
    if (body.generalInspiration !== undefined) {
      (settingsUpdate as any).generalInspiration = body.generalInspiration;
    }
    if (body.inspirationSections !== undefined) {
      (settingsUpdate as any).inspirationSections = body.inspirationSections;
    }
    if (body.sceneType !== undefined) {
      settingsUpdate.sceneType = body.sceneType;
    }

    // User Prompt
    if (body.userPrompt !== undefined) {
      settingsUpdate.userPrompt = body.userPrompt;
    }

    // Output Settings
    if (body.aspectRatio !== undefined) {
      settingsUpdate.aspectRatio = body.aspectRatio;
    }
    if (body.imageQuality !== undefined) {
      const normalizedQuality = normalizeImageQuality(body.imageQuality);
      if (!normalizedQuality) {
        return NextResponse.json(
          { error: `Invalid imageQuality: ${body.imageQuality}. Must be '1k', '2k', or '4k'` },
          { status: 400 }
        );
      }
      settingsUpdate.imageQuality = normalizedQuality;
    }
    if (body.variantsPerProduct !== undefined) {
      (settingsUpdate as any).variantsPerProduct = body.variantsPerProduct;
    }
    if (body.video !== undefined) {
      settingsUpdate.video = body.video as FlowGenerationSettings['video'];
    }

    // Update settings if any
    if (Object.keys(settingsUpdate).length > 0) {
      flow = await db.generationFlows.updateSettings(flowId, settingsUpdate);
    }

    // Update selectedBaseImages separately (not part of settings)
    if (body.selectedBaseImages !== undefined) {
      flow = await db.generationFlows.update(flowId, {
        selectedBaseImages: body.selectedBaseImages,
      });
    }

    console.log('✅ Updated studio settings:', flowId);

    return NextResponse.json({
      success: true,
      flowId: flow.id,
      settings: flow.settings,
    });
  } catch (error) {
    console.error('❌ Failed to update studio settings:', error);
    // Secure error handling - use helper
    return internalServerErrorResponse(error);
  }
});

export const GET = withSecurity(async (request, context, { params }) => {
  const clientId = context.clientId;
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id: flowId } = await params;

    const flow = await db.generationFlows.getById(flowId);

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Verify ownership
    if (
      !verifyOwnership({
        clientId,
        resourceClientId: flow.clientId,
        resourceType: 'generation-flow',
        resourceId: flowId,
      })
    ) {
      return forbiddenResponse();
    }

    // Fetch collection data if this flow belongs to a collection
    let collectionName: string | null = null;
    let collectionSettings: FlowGenerationSettings | null = null;
    let flowSceneType: string | null = null;
    if (flow.collectionSessionId) {
      const collection = await db.collectionSessions.getById(flow.collectionSessionId);
      if (collection) {
        collectionName = collection.name;
        // Return full collection settings including inspiration images and bubbles
        if (collection.settings) {
          collectionSettings = collection.settings as FlowGenerationSettings;
        }
        // Get the flow's scene type
        flowSceneType = (flow.settings?.sceneType as string) ?? null;
      }
    }

    const response = NextResponse.json({
      flowId: flow.id,
      settings: flow.settings,
      productIds: flow.productIds,
      selectedBaseImages: flow.selectedBaseImages,
      collectionSessionId: flow.collectionSessionId ?? null,
      collectionName,
      collectionSettings, // Full collection settings
      flowSceneType, // Scene type of this flow
    });

    // Cache studio settings for 10 seconds (private per-user)
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=20');

    return response;
  } catch (error) {
    console.error('❌ Failed to get studio settings:', error);
    // Secure error handling - use helper
    return internalServerErrorResponse(error);
  }
});
