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
  InspirationImage,
  SceneTypeInspirationMap,
  StylePreset,
  LightingPreset,
} from 'visualizer-types';
import { normalizeImageQuality } from 'visualizer-types';

interface UpdateSettingsRequest {
  // Scene Style (Section 1)
  inspirationImages?: InspirationImage[];
  sceneTypeInspirations?: SceneTypeInspirationMap;
  stylePreset?: string; // Can be preset or custom value
  lightingPreset?: string; // Can be preset or custom value
  sceneType?: string; // Scene type selection

  // User Prompt (Section 3)
  userPrompt?: string;

  // Output Settings (Section 4)
  aspectRatio?: ImageAspectRatio;
  imageQuality?: '1k' | '2k' | '4k';
  variantsCount?: number;
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

    // Scene Style settings
    if (body.inspirationImages !== undefined) {
      settingsUpdate.inspirationImages = body.inspirationImages;
    }
    if (body.sceneTypeInspirations !== undefined) {
      settingsUpdate.sceneTypeInspirations = body.sceneTypeInspirations;
    }
    if (body.stylePreset !== undefined) {
      settingsUpdate.stylePreset = body.stylePreset;
    }
    if (body.lightingPreset !== undefined) {
      settingsUpdate.lightingPreset = body.lightingPreset;
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
    if (body.variantsCount !== undefined) {
      settingsUpdate.variantsCount = body.variantsCount;
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
    let collectionSettings: {
      userPrompt?: string;
      stylePreset?: string;
      lightingPreset?: string;
    } | null = null;
    if (flow.collectionSessionId) {
      const collection = await db.collectionSessions.getById(flow.collectionSessionId);
      if (collection) {
        collectionName = collection.name;
        if (collection.settings) {
          collectionSettings = {
            userPrompt: collection.settings.userPrompt,
            stylePreset: collection.settings.stylePreset,
            lightingPreset: collection.settings.lightingPreset,
          };
        }
      }
    }

    const response = NextResponse.json({
      flowId: flow.id,
      settings: flow.settings,
      productIds: flow.productIds,
      selectedBaseImages: flow.selectedBaseImages,
      collectionSessionId: flow.collectionSessionId ?? null,
      collectionName,
      collectionSettings,
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
