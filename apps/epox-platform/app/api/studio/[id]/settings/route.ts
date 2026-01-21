/**
 * API Route: Update studio/generation flow settings
 * PATCH /api/studio/[id]/settings
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { withSecurity, verifyOwnership, forbiddenResponse } from '@/lib/security';
import type {
  FlowGenerationSettings,
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
  stylePreset?: StylePreset;
  lightingPreset?: LightingPreset;

  // User Prompt (Section 3)
  userPrompt?: string;

  // Output Settings (Section 4)
  aspectRatio?: string;
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
}

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
    if (!verifyOwnership({
      clientId,
      resourceClientId: flow.clientId,
      resourceType: 'generation-flow',
      resourceId: flowId,
    })) {
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

    flow = await db.generationFlows.updateSettings(flowId, settingsUpdate);

    console.log('✅ Updated studio settings:', flowId);

    return NextResponse.json({
      success: true,
      flowId: flow.id,
      settings: flow.settings,
    });
  } catch (error) {
    console.error('❌ Failed to update studio settings:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
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
    if (!verifyOwnership({
      clientId,
      resourceClientId: flow.clientId,
      resourceType: 'generation-flow',
      resourceId: flowId,
    })) {
      return forbiddenResponse();
    }

    return NextResponse.json({
      flowId: flow.id,
      settings: flow.settings,
      productIds: flow.productIds,
      selectedBaseImages: flow.selectedBaseImages,
    });
  } catch (error) {
    console.error('❌ Failed to get studio settings:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
