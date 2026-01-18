/**
 * API Route: Update studio/generation flow settings
 * PATCH /api/studio/[id]/settings
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { getClientId } from '@/lib/services/get-auth';
import type {
  FlowGenerationSettings,
  ImageQuality,
  InspirationImage,
  SceneTypeInspirationMap,
  StylePreset,
  LightingPreset,
} from 'visualizer-types';

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
  imageQuality?: '1K' | '2K' | '4K';
  variantsCount?: number;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: flowId } = await params;
    const clientId = await getClientId(request);
    const body: UpdateSettingsRequest = await request.json();

    console.log('📝 Updating studio settings:', { flowId, clientId, body });

    // Check if flow exists
    let flow = await db.generationFlows.getById(flowId);

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
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
      settingsUpdate.imageQuality = body.imageQuality as ImageQuality;
    }
    if (body.variantsCount !== undefined) {
      settingsUpdate.variantsCount = body.variantsCount;
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
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: flowId } = await params;

    const flow = await db.generationFlows.getById(flowId);

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
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
}
