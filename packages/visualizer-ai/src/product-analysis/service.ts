/**
 * Product Analysis Service
 * Analyzes products to determine room types, styles, and generate prompt suggestions
 * Supports AI-powered analysis via Gemini vision for accurate product data extraction
 *
 * Optimizations:
 * - Batch processing: Analyze up to 8 products in a single API call
 * - Tiered analysis: Only use AI when keyword confidence is low
 * - Caching: LRU cache with content hash to avoid re-analyzing same products
 * - Image resize: Resize to 512x512 before sending to reduce payload and latency
 */

import { createHash } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { createDefaultConfig } from '../config';
import type {
  ProductAnalysisInput,
  ProductAnalysisResult,
  BatchAnalysisResult,
  AnalysisOptions,
  AIAnalysisResult,
  ColorScheme,
  ProductSize,
} from './types';

const AI_CONFIG = createDefaultConfig();

// ============================================================================
// OPTIMIZATION CONFIG
// ============================================================================

/** Maximum products to analyze in a single batch API call */
const BATCH_SIZE = 8;

/** Confidence threshold - only use AI if keyword analysis confidence is below this */
const AI_CONFIDENCE_THRESHOLD = 0.6;

/** Target image size for resizing (width/height in pixels) */
const TARGET_IMAGE_SIZE = 512;

/** Maximum cache entries (LRU eviction when exceeded) */
const CACHE_MAX_SIZE = 500;

/** Cache TTL in milliseconds (24 hours) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry {
  result: AIAnalysisResult;
  timestamp: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): AIAnalysisResult | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  set(key: string, result: AIAnalysisResult): void {
    // Remove if exists (to update position)
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { result, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) != null;
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Generate a hash key for caching based on product content
 */
function generateCacheKey(product: ProductAnalysisInput): string {
  const content = JSON.stringify({
    name: product.name,
    description: product.description ?? '',
    category: product.category ?? '',
    tags: product.tags ?? [],
    imageUrl: product.imageUrl ?? '',
  });
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// Common room type keywords for fallback detection
const SCENE_TYPE_KEYWORDS: Record<string, string[]> = {
  'Living Room': ['sofa', 'couch', 'coffee table', 'living', 'lounge', 'armchair', 'loveseat'],
  Bedroom: ['bed', 'mattress', 'nightstand', 'dresser', 'wardrobe', 'headboard', 'bedroom'],
  Office: ['desk', 'office', 'chair', 'computer', 'workspace', 'work', 'ergonomic'],
  'Dining Room': ['dining', 'table', 'chair', 'buffet', 'sideboard', 'hutch'],
  Kitchen: ['kitchen', 'cabinet', 'counter', 'island', 'stool', 'bar'],
  Bathroom: ['bathroom', 'vanity', 'mirror', 'bath', 'shower', 'toilet', 'sink'],
  Outdoor: ['outdoor', 'patio', 'garden', 'deck', 'balcony', 'terrace'],
  Entryway: ['entry', 'foyer', 'hallway', 'console', 'coat', 'shoe'],
};

// Common style keywords
const STYLE_KEYWORDS: Record<string, string[]> = {
  Modern: ['modern', 'contemporary', 'sleek', 'clean', 'minimal'],
  Scandinavian: ['scandinavian', 'nordic', 'hygge', 'scandi'],
  Industrial: ['industrial', 'metal', 'iron', 'raw', 'urban', 'loft'],
  Bohemian: ['bohemian', 'boho', 'eclectic', 'global', 'colorful'],
  'Mid-Century Modern': ['mid-century', 'retro', '1950s', '1960s', 'vintage'],
  Traditional: ['traditional', 'classic', 'formal', 'timeless', 'elegant'],
  Farmhouse: ['farmhouse', 'rustic', 'country', 'barn', 'cottage'],
  Coastal: ['coastal', 'beach', 'nautical', 'seaside', 'ocean'],
  'Art Deco': ['art deco', 'glamour', 'geometric', 'gatsby', 'luxe'],
};

// Common color name → hex mapping for normalizing AI responses
const COLOR_NAME_TO_HEX: Record<string, string> = {
  neutral: '#B0A899',
  white: '#FFFFFF',
  black: '#000000',
  red: '#CC3333',
  blue: '#3366CC',
  green: '#339933',
  yellow: '#CCCC33',
  orange: '#CC7733',
  purple: '#7733CC',
  pink: '#CC6699',
  brown: '#8B4513',
  gray: '#808080',
  grey: '#808080',
  beige: '#D4C5A9',
  cream: '#FFFDD0',
  ivory: '#FFFFF0',
  tan: '#D2B48C',
  gold: '#CFB53B',
  silver: '#C0C0C0',
  navy: '#001F3F',
  teal: '#008080',
  charcoal: '#36454F',
  walnut: '#5C3317',
  oak: '#C19A6B',
  mahogany: '#4E1609',
  espresso: '#3C1414',
  chocolate: '#3D1C02',
  taupe: '#483C32',
  slate: '#708090',
  sand: '#C2B280',
  olive: '#556B2F',
  rust: '#B7410E',
  burgundy: '#800020',
  maroon: '#800000',
  coral: '#FF7F50',
  salmon: '#FA8072',
  peach: '#FFCBA4',
  lavender: '#B57EDC',
  mint: '#98FB98',
  turquoise: '#40E0D0',
  copper: '#B87333',
  brass: '#B5A642',
  chrome: '#DBE4EB',
  natural: '#C8B88A',
  'dark brown': '#3B2005',
  'dark-brown': '#3B2005',
  'light brown': '#B5835A',
  'light-brown': '#B5835A',
  'dark gray': '#555555',
  'dark-gray': '#555555',
  'light gray': '#D3D3D3',
  'light-gray': '#D3D3D3',
  'dark grey': '#555555',
  'dark-grey': '#555555',
  'light grey': '#D3D3D3',
  'light-grey': '#D3D3D3',
  'off-white': '#FAF9F6',
  'off white': '#FAF9F6',
};

/**
 * Normalize a color value to a valid hex code.
 * If the value is already hex, return it. Otherwise, look up in color name map.
 * Falls back to a neutral color if unknown.
 */
function normalizeColorToHex(color: string): string {
  const trimmed = color.trim();

  // Already a valid hex code
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    // Normalize 3-char hex to 6-char
    if (trimmed.length === 4) {
      const r = trimmed[1], g = trimmed[2], b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }

  // Look up by name (case-insensitive)
  const lower = trimmed.toLowerCase();
  if (COLOR_NAME_TO_HEX[lower]) {
    return COLOR_NAME_TO_HEX[lower];
  }

  // Try partial match (e.g., "Natural Oak" → "oak" or "natural")
  for (const [name, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
    if (lower.includes(name) || name.includes(lower)) {
      return hex;
    }
  }

  // Fallback
  return '#808080';
}

// Material keywords
const MATERIAL_KEYWORDS: Record<string, string[]> = {
  Wood: ['wood', 'oak', 'walnut', 'mahogany', 'pine', 'birch', 'teak', 'timber'],
  Metal: ['metal', 'steel', 'iron', 'brass', 'chrome', 'aluminum', 'copper'],
  Fabric: ['fabric', 'upholstered', 'linen', 'cotton', 'velvet', 'leather'],
  Glass: ['glass', 'tempered', 'crystal', 'mirror'],
  Stone: ['stone', 'marble', 'granite', 'concrete', 'slate', 'quartz'],
  Rattan: ['rattan', 'wicker', 'cane', 'bamboo'],
};

/**
 * AI Analysis prompt for single product - extracts structured product data
 */
const PRODUCT_ANALYSIS_PROMPT = `Analyze this product image along with the provided metadata. Extract structured information for use in AI image generation.

Product metadata:
{PRODUCT_METADATA}

Return JSON:
{
  "productType": "specific type (e.g., '3-seater sofa', 'dining table')",
  "sceneTypes": ["Living Room", "Bedroom", etc - 1-3 suitable rooms],
  "colorSchemes": [{"name": "Color Name", "colors": ["#hex1", "#hex2"]}],
  "materials": ["specific materials with finishes"],
  "size": {"type": "small|medium|large|specific", "dimensions": "optional, e.g., '1.60 x 0.90 m'"},
  "styles": ["Modern", "Scandinavian", etc - 1-3 styles]
}

IMPORTANT: All colors in colorSchemes MUST be valid hex color codes (e.g., "#8B4513", "#F5F5DC"). Never use color names like "brown" or "neutral".`;

/**
 * Batch analysis prompt - analyzes multiple products in one API call
 */
const BATCH_ANALYSIS_PROMPT = `Analyze these {COUNT} product images with their metadata. Extract structured information for each.

Products:
{PRODUCTS_METADATA}

Return a JSON array with one object per product (in the same order as provided):
[
  {
    "productId": "the product ID from metadata",
    "productType": "specific type (e.g., '3-seater sofa')",
    "sceneTypes": ["1-3 suitable rooms"],
    "colorSchemes": [{"name": "Color Name", "colors": ["#hex1", "#hex2"]}],
    "materials": ["detected materials"],
    "size": {"type": "small|medium|large|specific", "dimensions": "optional"},
    "styles": ["1-3 design styles"]
  }
]

Rules:
- Keep productType specific and lowercase
- Be accurate based on image, don't assume
- All colors MUST be valid hex color codes (e.g., "#8B4513", "#F5F5DC"). Never use color names`;

// ============================================================================
// IMAGE RESIZE UTILITY
// ============================================================================

/**
 * Resize image to target dimensions using canvas-less approach
 * Uses sharp-like resize via buffer manipulation for server-side
 * Falls back to original if resize fails
 */
async function resizeImageForAnalysis(base64Data: string, mimeType: string): Promise<{ base64Data: string; mimeType: string }> {
  try {
    // For server-side, we can use a simple approach:
    // If image is already small enough based on base64 size, skip resize
    // Base64 adds ~33% overhead, so 512x512 JPEG at ~80% quality ≈ 50-100KB ≈ 70-140KB base64
    const estimatedSizeKB = (base64Data.length * 0.75) / 1024;

    if (estimatedSizeKB < 150) {
      // Image is already small enough, skip resize
      return { base64Data, mimeType };
    }

    // For larger images, we'll use a quality reduction approach
    // This works for JPEG/WebP - just re-encode at lower quality
    // For server-side Next.js, we can use sharp if available

    try {
      // Dynamic import sharp (optional dependency)
      const sharp = await import('sharp').catch(() => null);

      if (sharp) {
        const inputBuffer = Buffer.from(base64Data, 'base64');
        const resizedBuffer = await sharp
          .default(inputBuffer)
          .resize(TARGET_IMAGE_SIZE, TARGET_IMAGE_SIZE, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        console.log(`📐 Resized image: ${estimatedSizeKB.toFixed(0)}KB → ${(resizedBuffer.length / 1024).toFixed(0)}KB`);

        return {
          base64Data: resizedBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        };
      }
    } catch {
      // Sharp not available, continue with original
    }

    // Fallback: return original if can't resize
    return { base64Data, mimeType };
  } catch (error) {
    console.warn('⚠️ Image resize failed, using original:', error);
    return { base64Data, mimeType };
  }
}

/**
 * Convert image URL to base64 for Gemini API
 */
async function urlToBase64(imageUrl: string): Promise<{ mimeType: string; base64Data: string }> {
  // Handle data URLs
  const base64Match = /^data:([^;]+);base64,(.+)$/.exec(imageUrl);
  if (base64Match) {
    return {
      mimeType: base64Match[1],
      base64Data: base64Match[2],
    };
  }

  // Handle regular URLs
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/')) {
    const fetchUrl = imageUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${imageUrl}` : imageUrl;

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') ?? 'image/png';

    return { mimeType, base64Data };
  }

  throw new Error(`Invalid image URL format: ${imageUrl.substring(0, 50)}...`);
}

export class ProductAnalysisService {
  private client: GoogleGenAI | null = null;
  private readonly textModel: string;
  private readonly fallbackTextModel: string;
  private readonly cache: LRUCache;

  // Stats for monitoring optimization effectiveness
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    tieredSkips: 0, // Products skipped due to high keyword confidence
    aiCalls: 0,
    batchCalls: 0,
  };

  constructor() {
    this.textModel = AI_CONFIG.gemini.textModel || 'gemini-2.5-flash-lite';
    this.fallbackTextModel = AI_CONFIG.gemini.fallbackTextModel || 'gemini-2.0-flash-lite';
    this.cache = new LRUCache(CACHE_MAX_SIZE, CACHE_TTL_MS);

    if (AI_CONFIG.gemini.apiKey) {
      this.client = new GoogleGenAI({ apiKey: AI_CONFIG.gemini.apiKey });
      return;
    }

    if (AI_CONFIG.gemini.useVertex) {
      const vertexProject = AI_CONFIG.gemini.vertex?.project;
      const vertexLocation = AI_CONFIG.gemini.vertex?.location || 'us-central1';

      if (!vertexProject) {
        console.warn('⚠️ Vertex AI enabled but GOOGLE_CLOUD_PROJECT is missing.');
        return;
      }

      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const credentials = JSON.parse(serviceAccountKey);
          this.client = new GoogleGenAI({
            vertexai: true,
            project: vertexProject,
            location: vertexLocation,
            googleAuthOptions: {
              credentials,
            },
          });
          return;
        } catch (error) {
          console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error);
          return;
        }
      }

      this.client = new GoogleGenAI({
        vertexai: true,
        project: vertexProject,
        location: vertexLocation,
      });
    }
  }

  /**
   * Get optimization statistics for monitoring
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate:
        this.stats.cacheHits + this.stats.cacheMisses > 0
          ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100
          : 0,
    };
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Analyze a product using Gemini vision AI with all optimizations:
   * 1. Cache lookup first
   * 2. Tiered analysis - skip AI if keyword confidence is high
   * 3. Image resize before sending
   */
  async analyzeProductWithAI(product: ProductAnalysisInput, options?: { forceAI?: boolean }): Promise<AIAnalysisResult> {
    // 1. CACHE: Check cache first
    const cacheKey = generateCacheKey(product);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      console.log(`📦 Cache hit for: ${product.name}`);
      return cached;
    }
    this.stats.cacheMisses++;

    // 2. TIERED: Run keyword analysis first
    const keywordResult = this.analyzeProductMetadata(product);

    // If keyword confidence is high enough and not forcing AI, use fallback
    if (!options?.forceAI && keywordResult.confidence >= AI_CONFIDENCE_THRESHOLD) {
      this.stats.tieredSkips++;
      console.log(`⚡ Tiered skip for: ${product.name} (confidence: ${keywordResult.confidence.toFixed(2)})`);
      const fallbackResult = this.buildFallbackAIResult(product);
      this.cache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }

    // Need AI analysis
    if (!this.client) {
      console.warn('⚠️ Gemini credentials not configured, using fallback analysis');
      const fallbackResult = this.buildFallbackAIResult(product);
      this.cache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }

    if (!product.imageUrl) {
      console.warn('⚠️ No image URL provided, using fallback analysis');
      const fallbackResult = this.buildFallbackAIResult(product);
      this.cache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }

    try {
      console.log(`🔍 Analyzing product with AI: ${product.name}`);
      this.stats.aiCalls++;

      // Build product metadata context
      const metadata = [
        `Name: ${product.name}`,
        product.description ? `Description: ${product.description}` : '',
        product.category ? `Category: ${product.category}` : '',
        product.tags?.length ? `Tags: ${product.tags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const prompt = PRODUCT_ANALYSIS_PROMPT.replace('{PRODUCT_METADATA}', metadata);

      // 3. RESIZE: Convert and resize image
      const rawImage = await urlToBase64(product.imageUrl);
      const { mimeType, base64Data } = await resizeImageForAnalysis(rawImage.base64Data, rawImage.mimeType);

      // Call Gemini vision API
      const response = await this.client.models.generateContent({
        model: this.textModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text ?? '';
      console.log(`✅ AI analysis completed for: ${product.name}`);

      // Parse and cache the result
      const parsed = JSON.parse(text);
      const result = this.parseAIResponse(parsed);
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`❌ AI analysis failed for ${product.name}:`, error);

      // Try fallback model if primary fails
      if (this.fallbackTextModel !== this.textModel) {
        try {
          console.log(`🔄 Retrying with fallback model: ${this.fallbackTextModel}`);
          const result = await this.analyzeWithFallbackModel(product);
          this.cache.set(cacheKey, result);
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback model also failed:', fallbackError);
        }
      }

      const fallbackResult = this.buildFallbackAIResult(product);
      this.cache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * BATCH PROCESSING: Analyze multiple products in a single API call
   * More efficient than individual calls - reduces API overhead by ~8x
   */
  async analyzeProductsBatchWithAI(
    products: ProductAnalysisInput[],
    options?: { forceAI?: boolean }
  ): Promise<Map<string, AIAnalysisResult>> {
    const results = new Map<string, AIAnalysisResult>();

    if (products.length === 0) {
      return results;
    }

    // Separate products into cached, tiered-skip, and needs-AI
    const needsAI: ProductAnalysisInput[] = [];
    const productCacheKeys = new Map<string, string>();

    for (const product of products) {
      const cacheKey = generateCacheKey(product);
      productCacheKeys.set(product.productId, cacheKey);

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        results.set(product.productId, cached);
        continue;
      }
      this.stats.cacheMisses++;

      // Tiered analysis check
      if (!options?.forceAI) {
        const keywordResult = this.analyzeProductMetadata(product);
        if (keywordResult.confidence >= AI_CONFIDENCE_THRESHOLD) {
          this.stats.tieredSkips++;
          const fallbackResult = this.buildFallbackAIResult(product);
          this.cache.set(cacheKey, fallbackResult);
          results.set(product.productId, fallbackResult);
          continue;
        }
      }

      // Has image and needs AI
      if (product.imageUrl) {
        needsAI.push(product);
      } else {
        const fallbackResult = this.buildFallbackAIResult(product);
        this.cache.set(cacheKey, fallbackResult);
        results.set(product.productId, fallbackResult);
      }
    }

    // Process products that need AI in batches
    if (needsAI.length > 0 && this.client) {
      const batches: ProductAnalysisInput[][] = [];
      for (let i = 0; i < needsAI.length; i += BATCH_SIZE) {
        batches.push(needsAI.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 Processing ${needsAI.length} products in ${batches.length} batch(es) of up to ${BATCH_SIZE}`);

      for (const batch of batches) {
        try {
          const batchResults = await this.processBatch(batch);
          for (const [productId, result] of batchResults) {
            const cacheKey = productCacheKeys.get(productId);
            if (cacheKey) {
              this.cache.set(cacheKey, result);
            }
            results.set(productId, result);
          }
        } catch (error) {
          console.error('❌ Batch processing failed, falling back to individual:', error);
          // Fallback for failed batch
          for (const product of batch) {
            const fallbackResult = this.buildFallbackAIResult(product);
            const cacheKey = productCacheKeys.get(product.productId);
            if (cacheKey) {
              this.cache.set(cacheKey, fallbackResult);
            }
            results.set(product.productId, fallbackResult);
          }
        }
      }
    }

    return results;
  }

  /**
   * Process a batch of products in a single API call
   */
  private async processBatch(products: ProductAnalysisInput[]): Promise<Map<string, AIAnalysisResult>> {
    const results = new Map<string, AIAnalysisResult>();

    if (!this.client || products.length === 0) {
      return results;
    }

    this.stats.batchCalls++;
    console.log(`🚀 Batch API call for ${products.length} products`);

    // Build metadata for all products
    const productsMetadata = products
      .map((p, idx) => {
        const meta = [
          `[Product ${idx + 1}]`,
          `ID: ${p.productId}`,
          `Name: ${p.name}`,
          p.description ? `Description: ${p.description}` : '',
          p.category ? `Category: ${p.category}` : '',
          p.tags?.length ? `Tags: ${p.tags.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        return meta;
      })
      .join('\n\n');

    const prompt = BATCH_ANALYSIS_PROMPT.replace('{COUNT}', String(products.length)).replace('{PRODUCTS_METADATA}', productsMetadata);

    // Prepare all images with resize
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    for (const product of products) {
      if (product.imageUrl) {
        try {
          const rawImage = await urlToBase64(product.imageUrl);
          const resized = await resizeImageForAnalysis(rawImage.base64Data, rawImage.mimeType);
          imageParts.push({
            inlineData: {
              mimeType: resized.mimeType,
              data: resized.base64Data,
            },
          });
        } catch (error) {
          console.warn(`⚠️ Failed to load image for ${product.name}:`, error);
          // Add placeholder
          imageParts.push({
            inlineData: {
              mimeType: 'image/png',
              data: '', // Empty - AI will work from metadata
            },
          });
        }
      }
    }

    // Build content parts: images first, then prompt
    const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
      ...imageParts.filter((p) => p.inlineData.data), // Only include valid images
      { text: prompt },
    ];

    const response = await this.client.models.generateContent({
      model: this.textModel,
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text);

    // Parse batch response
    if (Array.isArray(parsed)) {
      for (let i = 0; i < parsed.length && i < products.length; i++) {
        const parsedProductId = parsed[i].productId as string | undefined;
        const productId = parsedProductId ?? products[i].productId;
        const result = this.parseAIResponse(parsed[i]);
        results.set(productId, result);
      }
    }

    // Fill in any missing products with fallback
    for (const product of products) {
      if (!results.has(product.productId)) {
        results.set(product.productId, this.buildFallbackAIResult(product));
      }
    }

    console.log(`✅ Batch completed: ${results.size}/${products.length} products analyzed`);
    return results;
  }

  /**
   * Retry analysis with fallback model
   */
  private async analyzeWithFallbackModel(product: ProductAnalysisInput): Promise<AIAnalysisResult> {
    if (!this.client || !product.imageUrl) {
      return this.buildFallbackAIResult(product);
    }

    const metadata = [
      `Name: ${product.name}`,
      product.description ? `Description: ${product.description}` : '',
      product.category ? `Category: ${product.category}` : '',
      product.tags?.length ? `Tags: ${product.tags.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = PRODUCT_ANALYSIS_PROMPT.replace('{PRODUCT_METADATA}', metadata);

    // Resize image
    const rawImage = await urlToBase64(product.imageUrl);
    const { mimeType, base64Data } = await resizeImageForAnalysis(rawImage.base64Data, rawImage.mimeType);

    const response = await this.client.models.generateContent({
      model: this.fallbackTextModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    const parsed = JSON.parse(text);
    return this.parseAIResponse(parsed);
  }

  /**
   * Parse and validate AI response into AIAnalysisResult
   */
  private parseAIResponse(parsed: Record<string, unknown>): AIAnalysisResult {
    // Parse size
    const sizeData = parsed.size as Record<string, unknown> | undefined;
    const size: ProductSize = {
      type: (['small', 'medium', 'large', 'specific'].includes(sizeData?.type as string)
        ? sizeData?.type
        : 'medium') as ProductSize['type'],
      ...(sizeData?.dimensions && typeof sizeData.dimensions === 'string' ? { dimensions: sizeData.dimensions } : {}),
    };

    // Parse color schemes and normalize all colors to hex
    const colorSchemesRaw = parsed.colorSchemes as Array<Record<string, unknown>> | undefined;
    const colorSchemes: ColorScheme[] = Array.isArray(colorSchemesRaw)
      ? colorSchemesRaw.map((scheme) => ({
          name: typeof scheme.name === 'string' ? scheme.name : 'Default',
          colors: Array.isArray(scheme.colors)
            ? scheme.colors.filter((c): c is string => typeof c === 'string').map(normalizeColorToHex)
            : [],
        }))
      : [{ name: 'Default', colors: ['#808080'] }];

    return {
      productType: typeof parsed.productType === 'string' ? parsed.productType : 'furniture',
      sceneTypes: Array.isArray(parsed.sceneTypes) ? parsed.sceneTypes.filter((r): r is string => typeof r === 'string') : ['Living Room'],
      colorSchemes,
      materials: Array.isArray(parsed.materials) ? parsed.materials.filter((m): m is string => typeof m === 'string') : [],
      size,
      styles: Array.isArray(parsed.styles) ? parsed.styles.filter((s): s is string => typeof s === 'string') : ['Modern'],
      confidence: 0.85,
      analysisMethod: 'ai',
    };
  }

  /**
   * Build fallback AI result using keyword matching when AI is unavailable
   */
  private buildFallbackAIResult(product: ProductAnalysisInput): AIAnalysisResult {
    const metadataResult = this.analyzeProductMetadata(product);

    return {
      productType: metadataResult.productType.toLowerCase(),
      sceneTypes: metadataResult.suggestedsceneTypes,
      colorSchemes: [
        {
          name: 'Default',
          colors: [metadataResult.colors.primary, ...(metadataResult.colors.accent ?? [])].map(normalizeColorToHex),
        },
      ],
      materials: metadataResult.materials,
      size: { type: 'medium' },
      styles: metadataResult.style,
      confidence: metadataResult.confidence * 0.7, // Lower confidence for fallback
      analysisMethod: 'fallback',
    };
  }

  /**
   * Analyze a single product using metadata (no AI)
   */
  analyzeProductMetadata(product: ProductAnalysisInput): ProductAnalysisResult {
    const searchText = `${product.name} ${product.description ?? ''} ${product.category ?? ''}`.toLowerCase();

    // Detect room type
    let sceneType = 'Living Room'; // default
    let highestScore = 0;
    for (const [room, keywords] of Object.entries(SCENE_TYPE_KEYWORDS)) {
      const score = keywords.filter((kw) => searchText.includes(kw)).length;
      if (score > highestScore) {
        highestScore = score;
        sceneType = room;
      }
    }

    // Detect styles
    const detectedStyles: string[] = [];
    for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
      if (keywords.some((kw) => searchText.includes(kw))) {
        detectedStyles.push(style);
      }
    }
    if (detectedStyles.length === 0) {
      detectedStyles.push('Modern'); // default
    }

    // Detect materials
    const detectedMaterials: string[] = [];
    for (const [material, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
      if (keywords.some((kw) => searchText.includes(kw))) {
        detectedMaterials.push(material);
      }
    }

    // Suggest room types (primary + related)
    const suggestedsceneTypes = [sceneType];
    if (sceneType === 'Living Room') {
      suggestedsceneTypes.push('Office');
    }
    if (sceneType === 'Office') {
      suggestedsceneTypes.push('Living Room');
    }
    if (sceneType === 'Bedroom') {
      suggestedsceneTypes.push('Living Room');
    }

    // Build prompt keywords
    const promptKeywords = [
      product.name,
      sceneType.toLowerCase(),
      ...detectedStyles.map((s) => s.toLowerCase()),
      ...detectedMaterials.map((m) => `${m.toLowerCase()} material`),
    ].filter(Boolean);

    return {
      productId: product.productId,
      sceneType,
      productType: product.category ?? 'Furniture',
      style: detectedStyles,
      materials: detectedMaterials,
      colors: { primary: 'neutral' },
      suggestedsceneTypes,
      suggestedStyles: detectedStyles.slice(0, 3),
      promptKeywords,
      confidence: highestScore > 0 ? Math.min(0.9, 0.5 + highestScore * 0.1) : 0.5,
    };
  }

  /**
   * Analyze multiple products and build aggregate insights
   * Uses optimized batch processing when AI is enabled:
   * - Batch API calls (up to 8 products per call)
   * - LRU caching to avoid re-analysis
   * - Tiered analysis (skip AI for high-confidence keyword matches)
   * - Image resizing to reduce payload
   */
  async analyzeBatch(products: ProductAnalysisInput[], options?: AnalysisOptions): Promise<BatchAnalysisResult> {
    let productResults: ProductAnalysisResult[];

    if (options?.useAI || options?.includeImageAnalysis) {
      // Use optimized batch AI analysis
      console.log(`🔄 Starting optimized batch analysis for ${products.length} products...`);

      const aiResults = await this.analyzeProductsBatchWithAI(products, {
        forceAI: options.includeImageAnalysis,
      });

      // Merge AI results with metadata results
      productResults = products.map((p) => {
        const metadataResult = this.analyzeProductMetadata(p);
        const aiAnalysis = aiResults.get(p.productId);

        if (aiAnalysis) {
          return {
            ...metadataResult,
            aiAnalysis,
            // Override some fields with AI analysis results
            sceneType: aiAnalysis.sceneTypes[0] ?? metadataResult.sceneType,
            productType: aiAnalysis.productType,
            style: aiAnalysis.styles.length > 0 ? aiAnalysis.styles : metadataResult.style,
            materials: aiAnalysis.materials.length > 0 ? aiAnalysis.materials : metadataResult.materials,
            confidence: aiAnalysis.confidence,
          };
        }
        return metadataResult;
      });

      // Log optimization stats
      const stats = this.getStats();
      console.log(
        `📊 Batch complete: ${stats.cacheHits} cache hits, ${stats.tieredSkips} tiered skips, ${stats.batchCalls} batch calls, ${stats.aiCalls} individual AI calls`
      );
    } else {
      // Use keyword-based analysis only (no AI)
      productResults = products.map((p) => this.analyzeProductMetadata(p));
    }

    // Build room type distribution
    const sceneTypeDistribution: Record<string, number> = {};
    for (const result of productResults) {
      sceneTypeDistribution[result.sceneType] = (sceneTypeDistribution[result.sceneType] || 0) + 1;
    }

    // Build product room assignments
    const productRoomAssignments: Record<string, string> = {};
    for (const result of productResults) {
      productRoomAssignments[result.productId] = result.sceneType;
    }

    // Collect unique product types
    const productTypes = [...new Set(productResults.map((r) => r.productType))];

    // Determine dominant category
    const categoryCounts: Record<string, number> = {};
    for (const result of productResults) {
      categoryCounts[result.productType] = (categoryCounts[result.productType] || 0) + 1;
    }
    const dominantCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Furniture';

    // Collect suggested styles
    const styleCounts: Record<string, number> = {};
    for (const result of productResults) {
      for (const style of result.style) {
        styleCounts[style] = (styleCounts[style] || 0) + 1;
      }
    }
    const suggestedStyles = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([style]) => style);

    // Build recommended inspiration keywords
    const sceneTypes = Object.keys(sceneTypeDistribution);
    const recommendedInspirationKeywords = [
      ...sceneTypes.map((r) => `${suggestedStyles[0]?.toLowerCase() || 'modern'} ${r.toLowerCase()}`),
      ...suggestedStyles.slice(0, 3).map((s) => `${s.toLowerCase()} interior`),
    ];

    return {
      sceneTypeDistribution,
      productTypes,
      dominantCategory,
      suggestedStyles,
      recommendedInspirationKeywords,
      productRoomAssignments,
      products: productResults,
      analyzedAt: new Date(),
    };
  }
}

// Singleton instance
let _productAnalysisService: ProductAnalysisService | null = null;

export function getProductAnalysisService(): ProductAnalysisService {
  _productAnalysisService ??= new ProductAnalysisService();
  return _productAnalysisService;
}
