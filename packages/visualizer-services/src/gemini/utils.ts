// ===== GEMINI SERVICE UTILITIES =====

import { MATERIAL_KEYWORDS, COLOR_KEYWORDS, STYLE_MAP } from './constants';

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

/**
 * Converts a File object to a GenAI inline data part.
 */
export async function fileToGenerativePart(file: File) {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

const DATA_URL_PATTERN = /^data:([^;]+);base64,([\s\S]+)$/;

/**
 * Infer MIME type from URL path extension when content-type is unreliable
 */
function inferMimeTypeFromUrl(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  const extension = pathname.split('.').pop();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
  };
  return mimeTypes[extension || ''] || 'image/jpeg';
}

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
  
  // Get content-type from headers, but handle unreliable values
  let mimeType = response.headers.get('content-type') || '';
  
  // If content-type is missing or unreliable (octet-stream, binary), infer from URL
  if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') {
    mimeType = inferMimeTypeFromUrl(input);
    console.warn(`⚠️ normalizeImageInput: Inferred MIME type '${mimeType}' from URL (original: '${response.headers.get('content-type')}')`);
  }

  return { mimeType, base64Data };
};
