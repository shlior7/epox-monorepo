// ===== FILE UTILITIES =====

export async function fileToBase64(file: File): Promise<string> {
  // Server-side implementation using Buffer instead of FileReader
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  // Ensure we have a valid image MIME type
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/xml' || mimeType === 'application/octet-stream') {
    // Infer from filename
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    mimeType = mimeTypes[extension || 'jpg'] || 'image/jpeg';
    console.warn(`⚠️ fileToBase64: Corrected MIME type from '${file.type}' to '${mimeType}' for file '${file.name}'`);
  }

  return `data:${mimeType};base64,${base64}`;
}

// Convert File to GenAI inline data format
export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  // Server-side implementation using Buffer instead of FileReader
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  // Ensure we have a valid image MIME type
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/xml' || mimeType === 'application/octet-stream') {
    // Infer from filename
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    mimeType = mimeTypes[extension || 'jpg'] || 'image/jpeg';
    console.warn(`⚠️ fileToGenerativePart: Corrected MIME type from '${file.type}' to '${mimeType}' for file '${file.name}'`);
  }

  return {
    inlineData: {
      data: base64,
      mimeType: mimeType,
    },
  };
}

/**
 * Estimate token usage for cost calculation
 */
export function estimateTokenUsage(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

/**
 * Optimize prompts for minimal token usage while maintaining quality
 */
export function optimizePrompt(prompt: string, aggressive: boolean = false): string {
  // Remove redundant words and optimize for cost
  let optimized = prompt
    .replace(/\b(very|really|quite|extremely|highly)\s+/gi, '') // Remove intensity modifiers
    .replace(/\b(please|kindly|could you)\s*/gi, '') // Remove politeness words
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (aggressive) {
    // More aggressive optimization for fallback
    optimized = optimized
      .replace(/\b(a|an|the)\s+/gi, '') // Remove articles
      .replace(/\b(in|on|at|for|with|by)\s+/gi, '') // Remove some prepositions
      .replace(/[,;]\s*/g, ' ') // Remove punctuation
      .slice(0, 400); // Hard limit
  }

  // Ensure we don't exceed token limits
  if (optimized.length > 400) {
    optimized = optimized.slice(0, 400).trim();
  }

  return optimized;
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Parse size string (e.g., "300px") to number
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') return size;
  const parsed = parseInt(size.replace('px', '').trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}
