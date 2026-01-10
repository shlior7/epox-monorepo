import { NextRequest, NextResponse } from 'next/server';
import { visualizationQueue } from '../../../lib/services/visualization/queue';
import type { VisualizationRequest, ProductAsset } from '../../../lib/services/shared/types';
import type { ApiVisualizationRequest } from '../../../lib/api/client';
import path from 'path';
import { readFile } from 'fs/promises';

// Configure serverless function timeout for long-running image generation
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

async function convertApiAssetToProductAsset(apiAsset: { url: string; type: 'image' | 'model'; preview?: string }): Promise<ProductAsset> {
  // Sanitize and validate the path to prevent traversal attacks
  const publicDir = path.join(process.cwd(), 'public');
  const filePath = path.resolve(publicDir, apiAsset.url);

  // Ensure the resolved path is still within the public directory
  if (!filePath.startsWith(publicDir + path.sep)) {
    throw new Error('Invalid file path: path traversal detected');
  }

  const fileBuffer = await readFile(filePath);

  // Create a proper ArrayBuffer
  const arrayBuffer = new ArrayBuffer(fileBuffer.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(fileBuffer);

  // Create a File-like object from ArrayBuffer
  const file = new File([arrayBuffer], path.basename(apiAsset.url), {
    type: apiAsset.type === 'image' ? 'image/jpeg' : 'model/gltf-binary', // Default types
  });

  return {
    file,
    type: apiAsset.type,
    preview: apiAsset.preview,
  };
}

export async function POST(request: Request) {
  try {
    console.log('🚀 API: Starting visualization generation...');

    const body = (await request.json()) as ApiVisualizationRequest;
    console.log('📨 API: Received request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.productName || !body.style || !body.location) {
      console.error('❌ API: Missing required fields');
      return NextResponse.json({ error: 'Missing required fields: productName, style, and location' }, { status: 400 });
    }

    console.log('✅ API: Request validation passed');

    // Convert API request to service request
    const serviceRequest: VisualizationRequest = {
      ...body,
      productAsset: body.productAsset ? await convertApiAssetToProductAsset(body.productAsset) : undefined,
    };

    console.log('🔄 API: Converted to service request:', {
      ...serviceRequest,
      productAsset: serviceRequest.productAsset ? 'FILE_OBJECT' : undefined,
    });

    console.log('📥 API: Enqueuing visualization job');
    const { jobId } = await visualizationQueue.enqueue(serviceRequest);

    console.log('✅ API: Job enqueued with id', jobId);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('❌ API: Visualization generation failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
