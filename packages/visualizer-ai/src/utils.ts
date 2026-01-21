import { MATERIAL_KEYWORDS, COLOR_KEYWORDS, STYLE_MAP } from './constants';

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

// ===== GEMINI-SPECIFIC UTILITIES =====

/**
 * Extract materials from text using keyword matching (no additional API calls)
 */
export function extractMaterials(text: string): string[] {
  return MATERIAL_KEYWORDS.filter((material) => text.includes(material)).slice(0, 3);
}

/**
 * Extract colors from text using keyword matching (no additional API calls)
 */
export function extractColors(text: string): string[] {
  return COLOR_KEYWORDS.filter((color) => text.includes(color)).slice(0, 3);
}

/**
 * Extract style from text using keyword matching (no additional API calls)
 */
export function extractStyle(text: string): string {
  for (const [keyword, style] of Object.entries(STYLE_MAP)) {
    if (text.includes(keyword)) return style;
  }
  return 'contemporary';
}

/**
 * Get default analysis from filename to avoid API costs when possible
 */
export function getDefaultAnalysisFromFileName(fileName: string): {
  materials: string[];
  colors: string[];
  style: string;
  suggestions: string[];
} {
  const lowerFileName = fileName.toLowerCase();

  // Smart defaults based on common product types
  if (lowerFileName.includes('furniture') || lowerFileName.includes('chair') || lowerFileName.includes('table')) {
    return {
      materials: ['wood', 'metal'],
      colors: ['natural', 'neutral'],
      style: 'modern',
      suggestions: ['studio lighting', 'clean background', 'side angle'],
    };
  }

  if (lowerFileName.includes('tech') || lowerFileName.includes('electronic') || lowerFileName.includes('device')) {
    return {
      materials: ['plastic', 'metal'],
      colors: ['black', 'white'],
      style: 'modern',
      suggestions: ['professional lighting', 'tech background', 'front view'],
    };
  }

  // Generic default
  return {
    materials: ['contemporary'],
    colors: ['neutral'],
    style: 'modern',
    suggestions: ['professional lighting', 'clean background', 'optimal angle'],
  };
}

const DATA_URL_PATTERN = /^data:([^;]+);base64,([\s\S]+)$/;

/**
 * Normalizes an image input (URL or data URL) into a consistent format.
 */
export const normalizeImageInput = async (input: string): Promise<{ mimeType: string; base64Data: string }> => {
  const dataUrlMatch = input.match(DATA_URL_PATTERN);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      base64Data: dataUrlMatch[2],
    };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid image URL format');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch image');
  }

  const imageBuffer = await response.arrayBuffer();
  const base64Data = Buffer.from(imageBuffer).toString('base64');
  let mimeType = response.headers.get('content-type') || 'image/jpeg';

  // Handle invalid MIME types that Gemini doesn't accept
  if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'application/xml') {
    // Try to infer from URL path
    const pathname = url.pathname.toLowerCase();
    const extension = pathname.split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    mimeType = mimeTypes[extension || ''] || 'image/jpeg';
    console.warn(
      `⚠️ normalizeImageInput: Corrected MIME type from '${response.headers.get('content-type')}' to '${mimeType}' for URL '${input.substring(0, 100)}...'`
    );
  }

  return { mimeType, base64Data };
};
