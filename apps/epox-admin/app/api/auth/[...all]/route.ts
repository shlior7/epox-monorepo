import { auth } from 'visualizer-auth/server';
import { toNextJsHandler } from 'better-auth/next-js';
import type { NextRequest } from 'next/server';

// Lazy-initialize the handlers
let handlers: ReturnType<typeof toNextJsHandler> | null = null;

function getHandlers() {
  if (!handlers) {
    console.log('🔐 Initializing better-auth handlers');
    handlers = toNextJsHandler(auth);
    console.log('✅ Better-auth handlers initialized');
  }
  return handlers;
}

export async function GET(request: NextRequest) {
  console.log('📥 GET request to:', request.url);
  try {
    const response = await getHandlers().GET(request);
    console.log('✅ GET response status:', response.status);
    return response;
  } catch (error) {
    console.error('❌ GET error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log('📥 POST request to:', request.url);
  try {
    const response = await getHandlers().POST(request);
    console.log('✅ POST response status:', response.status);
    return response;
  } catch (error) {
    console.error('❌ POST error:', error);
    throw error;
  }
}
