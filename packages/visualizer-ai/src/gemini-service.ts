import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { createDefaultConfig } from './config';
import { AI_MODELS, ERROR_MESSAGES } from './constants';
import { estimateTokenUsage } from './utils';
import type {
  ProductAnalysis,
  ProductAsset,
  ComponentAnalysisResult,
  EditImageRequest,
  EditImageResponse,
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  GeminiVideoRequest,
  GeminiVideoResponse,
  SceneAnalysisResult,
} from './types';
import {
  extractColors,
  extractMaterials,
  extractStyle,
  fileToGenerativePart,
  getDefaultAnalysisFromFileName,
  normalizeImageInput,
} from './utils';

const AI_CONFIG = createDefaultConfig();

/** Gemini 3 model ID - required for 2K/4K image generation */
const GEMINI_3_MODEL = 'gemini-3-pro-image-preview';

const COMPONENT_ANALYSIS_PROMPT = `Analyze this image and identify all the distinct visual components/elements in it.

For each component, provide a simple one or two word name (like: bed, rug, floor, wall, plant, lamp, sofa, table, chair, curtain, pillow, artwork, vase, shelf, window, ceiling, door, cabinet, etc.)

Also analyze the image quality and suggest improvements for lighting, color, and overall appearance.

Your response must be a valid JSON object with this structure:

{
  "components": [
    { "id": "1", "name": "floor", "description": "hardwood flooring in light oak tone" },
    { "id": "2", "name": "wall", "description": "off-white painted wall" },
    { "id": "3", "name": "sofa", "description": "gray modern sectional sofa" }
  ],
  "overallDescription": "A modern living room with natural lighting",
  "suggestedAdjustments": [
    {
      "id": "1",
      "label": "Brighten the image",
      "description": "The scene appears slightly underexposed",
      "prompt": "Brighten the overall image exposure while maintaining natural lighting",
      "icon": "sun",
      "category": "lighting"
    }
  ]
}

Component rules:
- Keep component names simple and lowercase (1-2 words max)
- Include structural elements (floor, wall, ceiling, window)
- Include furniture and decor items
- Include any plants or accessories
- Limit to 10-15 most prominent components
- Order by visual prominence (most prominent first)

Adjustment hint rules:
- Suggest 2-5 improvements based on actual issues detected
- Each hint should have a clear, actionable label (3-5 words)
- The prompt should be a specific instruction for AI image editing
- icon must be one of: "sun" (brightness/exposure), "thermometer" (temperature), "palette" (color/saturation), "contrast" (contrast/clarity), "sparkles" (effects/enhancement), "eye" (visibility/detail)
- category must be one of: "lighting", "color", "composition", "style"
- Focus on common issues like: underexposed/overexposed, color temperature, low contrast, washed out colors, dark areas, harsh lighting
- Only suggest adjustments if there are actual issues to fix

`;

const SCENE_ANALYSIS_PROMPT = `Analyze this interior/scene image and extract the following information as JSON.

Your response must be a valid JSON object with these exact fields:

{
  "sceneType": "one of: Studio Set, Office, Living Room, Bedroom, Kitchen, Outdoor Patio, Rooftop Terrace, Garden, Poolside Deck, Beach, or Custom",
  "style": "one of: Modern Minimalist, Luxury / Premium, Rustic / Natural, Scandinavian, Industrial Loft, Futuristic / Tech, Bohemian Chic, Coastal / Mediterranean, Vintage / Retro, Artistic Conceptual, or Custom",
  "lighting": "one of: Natural Daylight, Golden Hour / Sunset Glow, Studio Soft Light, Bright Noon Sunlight, Overcast Ambient, Neon / LED Accent, Candlelight / Warm Interior, HDRI Environmental Light, or Custom",
  "cameraAngle": "one of: Front, 3/4 View, Side, Top-Down, Eye-Level",
  "surroundings": "one of: Minimal (No Props), Office Decor, Outdoor Patio Props, Bedroom Setup, Poolside Accessories, Cafe Ambiance, With Many Props, or Custom",
  "colorScheme": "one of: Neutral, Monochromatic Neutral, Warm Earth Tones, Cool Slate & Blues, Vibrant Pop Colors, Deep Emerald & Gold, Soft Pastel Mix, High Contrast B&W, Scandinavian Whites, Industrial Grays, or Custom",
  "props": ["array of staging elements visible - use from: Lush Greenery, Minimalist Plants, Modern Wall Art, Abstract Decor, Designer Rugs, Coffee Table Books, Ceramic Vases, Ambient Lamps, Textured Cushions, Tech Gadgets, Mirrors, Sculptures"],
  "promptText": "A detailed 2-3 sentence description of the scene that can be used as generation instructions. Describe the space layout, architectural features, materials, textures, mood, and any distinctive elements. Be specific and evocative."
}

`;

const VISION_SCANNER_PROMPT = `You are a Forensic Interior Architecture Scanner. Your goal is to analyze the input image and extract a structured inventory of visual elements for a generative 3D reconstruction pipeline.

### CRITICAL INSTRUCTIONS
1. **NO SUMMARIZATION:** Do not describe the "vibe." Break the scene down into atomic elements.
2. **STRICT JSON OUTPUT:** You must output ONLY valid JSON. No markdown formatting, no conversational text.
3. **UNIVERSAL SCANNING:** Detect every major surface, prop, and light source.
4. **STYLING DETECTION:** Explicitly look for accessories placed ON the main furniture/subject in the reference (e.g., throw blankets, pillows, open books) and extract them separately.

### OUTPUT SCHEMA (JSON)
{
  "styleSummary": "A concise, one-sentence visual hook describing the overall vibe (e.g., 'A serene, cream-white Japandi bedroom with soft organic curves.')",
  "detectedSceneType": "The type of scene/room detected (e.g., 'Bedroom', 'Living Room', 'Office', 'Kitchen', 'Garden', 'Studio').",
  "heroObjectAccessories": {
    "description": "If the reference image contains a main object (like a bed, sofa, or table) with decor ON it, describe it here. If none, return null.",
    "identity": "String (e.g., 'Chunky Knit Throw Blanket', 'Ceramic Vase with dried flowers')",
    "materialPhysics": "String (e.g., 'Cream wool with heavy drape', 'Matte white porcelain')",
    "placement": "String (e.g., 'Draped casually over the bottom left corner', 'Centered on the table surface')"
  },
  "sceneInventory": [
    {
      "identity": "String (e.g., 'Back Wall', 'Curtain', 'Floor Lamp')",
      "geometry": "String (e.g., 'Arched', 'Tall and columnar', 'Flat and expansive')",
      "surfacePhysics": "String (e.g., 'Rough hewn limestone', 'Semi-transparent linen', 'Polished concrete')",
      "colorGrading": "String (e.g., 'Warm terracotta', 'Desaturated sage green', 'Deep navy')",
      "spatialContext": "String (e.g., 'Framing the view', 'Draping loosely over the window', 'Receding into shadow')"
    }
  ],
  "lightingPhysics": {
    "sourceDirection": "String (e.g., 'Hard sunlight from top-left')",
    "shadowQuality": "String (e.g., 'Long, sharp, high-contrast shadows')",
    "colorTemperature": "String (e.g., 'Golden hour warm', 'Cool overcast blue')"
  }
}
`;

const SUBJECT_SCANNER_PROMPT = `You are a Product Taxonomy and Computer Vision Analyst. Your goal is to analyze the input product image and output strict metadata to control a generative pipeline.

### OUTPUT SCHEMA (JSON)
{
  "subjectClassHyphenated": "String (e.g., 'Dining-Chair', 'Serum-Bottle', 'Floor-Lamp', 'Coffee-Table'). Hyphenate multi-word names to treat them as a single token.",
  "nativeSceneTypes": "Array of strings - ALL logical environments where this object could naturally function. Use hyphenated format. Examples: ['Living-Room', 'Office', 'Bedroom'] for a chair, ['Bathroom', 'Vanity-Counter'] for skincare, ['Kitchen', 'Dining-Room'] for cookware.",
  "nativeSceneCategory": "Enum (Select ONE strictly: 'Indoor Room', 'Outdoor Nature', 'Urban/Street', 'Studio'). Based on where this product is typically used.",
  "inputCameraAngle": "Enum (Select ONE strictly: 'Frontal', 'Angled', 'Top-Down', 'Low Angle'). Based on the product's perspective in the frame.",
  "dominantColors": "Array of color names detected in the product (e.g., ['Walnut Brown', 'Brass Gold', 'Cream White'])",
  "materialTags": "Array of material keywords (e.g., ['wood', 'metal', 'fabric', 'glass', 'leather', 'ceramic'])"
}

### IMPORTANT RULES
1. For nativeSceneTypes, include ALL plausible scene types where this product could be placed. A dining chair could work in a dining room, office, or living room. A bed only works in a bedroom.
2. Use hyphenated format for multi-word scene types: "Living-Room" not "Living Room"
3. Be specific with subjectClassHyphenated - "Accent-Chair" is better than just "Chair"
4. Detect the actual camera angle from the image perspective, not what would be ideal
`;

const VIDEO_PROMPT_ENHANCE_PROMPT = `You are a professional video prompt engineer.

Goal: create a concise, production-ready video prompt based on the provided image and settings.

Rules:
- Return plain text only (no JSON, no quotes).
- Keep it to 2-3 sentences, max 60 words.
- Align strictly with the image contents; do not invent new objects.
- Incorporate settings if provided (video type, camera motion, aspect ratio, resolution, sound).
- Follow best practices: single continuous shot, clear subject action, smooth physically plausible motion, consistent lighting/scale, avoid impossible actions or physics-defying effects.
`;

const VIDEO_SYSTEM_PROMPT_PREFIX = 'SYSTEM GUIDELINES:';

const VIDEO_GENERATION_SYSTEM_GUIDELINES = `Create a high-end commercial product video that showcases the product.
- Preserve product identity (shape, materials, colors, branding) from the source image.
- Keep background, lighting, and shadows consistent; avoid flicker.
- Use a single continuous shot with smooth, physically plausible motion.
- Keep the product in frame and in focus; avoid occlusion.
- Do not add or remove objects or change the environment unless explicitly requested.
- Follow any provided settings and sound instructions exactly.`;

const buildVideoGenerationPrompt = (
  prompt: string,
  settings: { aspectRatio?: GeminiVideoRequest['aspectRatio']; resolution?: GeminiVideoRequest['resolution'] }
): string => {
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.startsWith(VIDEO_SYSTEM_PROMPT_PREFIX)) {
    return trimmedPrompt;
  }

  const settingsLines: string[] = [];
  if (settings.aspectRatio) settingsLines.push(`Aspect ratio: ${settings.aspectRatio}`);
  if (settings.resolution) settingsLines.push(`Resolution: ${settings.resolution}`);
  const settingsBlock = settingsLines.length > 0 ? `Settings:\n${settingsLines.join('\n')}\n` : '';

  return `${VIDEO_SYSTEM_PROMPT_PREFIX}\n${VIDEO_GENERATION_SYSTEM_GUIDELINES}\n\n${settingsBlock}User prompt:\n${trimmedPrompt}`;
};

const SUPPORTED_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);

const normalizeAspectRatio = (value?: string): string => {
  const fallback = AI_CONFIG.optimization?.defaultAspectRatio ?? '1:1';
  if (!value) {
    return fallback;
  }
  const match = /\d+:\d+/.exec(value);
  if (!match) {
    return fallback;
  }
  const ratio = match[0];
  return SUPPORTED_ASPECT_RATIOS.has(ratio) ? ratio : fallback;
};

const normalizeImageSize = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.toUpperCase();
  return normalized === '1K' || normalized === '2K' || normalized === '4K' ? normalized : undefined;
};

const normalizeVertexModelName = (model: string): string => {
  if (model.startsWith('projects/') || model.startsWith('publishers/')) {
    return model;
  }
  return `publishers/google/models/${model}`;
};

type VisionScannerOutput = {
  styleSummary: string;
  detectedSceneType: string;
  heroObjectAccessories: {
    identity: string;
    materialPhysics: string;
    placement: string;
  } | null;
  sceneInventory: Array<{
    identity: string;
    geometry: string;
    surfacePhysics: string;
    colorGrading: string;
    spatialContext: string;
  }>;
  lightingPhysics: {
    sourceDirection: string;
    shadowQuality: string;
    colorTemperature: string;
  };
};

type SubjectScannerOutput = {
  subjectClassHyphenated: string;
  nativeSceneTypes: string[];
  nativeSceneCategory: 'Indoor Room' | 'Outdoor Nature' | 'Urban/Street' | 'Studio';
  inputCameraAngle: 'Frontal' | 'Angled' | 'Top-Down' | 'Low Angle';
  dominantColors?: string[];
  materialTags?: string[];
};

export class GeminiService {
  private readonly client: GoogleGenAI;
  private readonly vertexClient: GoogleGenAI | null;
  private readonly textClientUsesVertex: boolean;
  private readonly imageModel: string;
  private readonly editModel: string;
  private readonly fallbackImageModel: string;
  private readonly textModel: string;
  private readonly fallbackTextModel: string;

  constructor() {
    const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';

    if (useVertex) {
      const vertexProject = process.env.GOOGLE_CLOUD_PROJECT;
      const vertexLocation = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
      if (!vertexProject) {
        throw new Error('Vertex AI requires GOOGLE_CLOUD_PROJECT environment variable.');
      }

      // Support service account credentials from environment variable
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const credentials = JSON.parse(serviceAccountKey);
          this.vertexClient = new GoogleGenAI({
            vertexai: true,
            project: vertexProject,
            location: vertexLocation,
            googleAuthOptions: { credentials },
          });
          console.log('🔐 Using service account credentials for Vertex AI');
        } catch (e) {
          console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
          throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON format');
        }
      } else {
        // Fall back to Application Default Credentials (ADC)
        this.vertexClient = new GoogleGenAI({
          vertexai: true,
          project: vertexProject,
          location: vertexLocation,
        });
        console.log('🔐 Using Application Default Credentials for Vertex AI');
      }
    } else {
      this.vertexClient = null;
    }

    if (AI_CONFIG.gemini.apiKey) {
      this.client = new GoogleGenAI({ apiKey: AI_CONFIG.gemini.apiKey });
      this.textClientUsesVertex = false;
      console.log('🔷 Initializing AI Studio client');
    } else if (this.vertexClient) {
      this.client = this.vertexClient;
      this.textClientUsesVertex = true;
    } else {
      throw new Error(ERROR_MESSAGES.MISSING_API_KEY);
    }

    this.imageModel = AI_CONFIG.gemini.imageModel || AI_MODELS.IMAGE;
    this.editModel = AI_CONFIG.gemini.editModel || AI_MODELS.IMAGE_EDIT;
    this.fallbackImageModel = AI_CONFIG.gemini.fallbackImageModel || AI_MODELS.IMAGE;
    this.textModel = AI_CONFIG.gemini.textModel || AI_MODELS.TEXT;
    this.fallbackTextModel = AI_CONFIG.gemini.fallbackTextModel || AI_MODELS.FALLBACK_TEXT;
  }

  private resolveTextModel(model: string): string {
    return this.textClientUsesVertex ? normalizeVertexModelName(model) : model;
  }

  /**
   * Edit an image using Gemini's generateContent API.
   * Uses multimodal input to provide the base image and edit instructions.
   */
  async editImage(request: EditImageRequest): Promise<EditImageResponse> {
    const { baseImageDataUrl, prompt, referenceImages, modelOverrides } = request;

    console.log('🎨 Editing image with prompt:', `${prompt.substring(0, 100)}...`);

    // Build the edit prompt with guard rails
    const editGuard =
      'Apply ONLY the requested edits. Do not change anything else: keep composition, camera, lighting, colors, materials, and all other elements unchanged.';
    const referenceNames = referenceImages?.map((refImage) => refImage.componentName).filter(Boolean) ?? [];
    const referenceLine = referenceNames.length > 0 ? `\n\nFocus on these components only: ${referenceNames.join(', ')}.` : '';
    const editPrompt = `${editGuard}\n\nEdit request: ${prompt}${referenceLine}`;

    // Use Gemini models for editing - they support multimodal input/output via generateContent API
    // Default to Gemini 3 Pro Image for best editing results, fallback to Gemini 2.5 Flash Image
    const primaryModel = modelOverrides?.imageModel ?? this.editModel;
    const fallbackModel = modelOverrides?.fallbackImageModel ?? this.fallbackImageModel;

    console.log(`🔧 Using ${primaryModel} for image editing`);

    return this.editImageWithGemini(baseImageDataUrl, editPrompt, primaryModel, fallbackModel);
  }

  /**
   * Detect MIME type from file extension
   */
  private getMimeTypeFromExtension(url: string): string | null {
    const extMatch = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(url);
    if (!extMatch) {
      return null;
    }

    const ext = extMatch[1].toLowerCase();
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
    };
    return mimeMap[ext] ?? null;
  }

  /**
   * Detect MIME type from binary data (magic bytes)
   */
  private getMimeTypeFromBuffer(buffer: ArrayBuffer): string | null {
    const bytes = new Uint8Array(buffer.slice(0, 12));

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return 'image/gif';
    }
    // WebP: RIFF....WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
    // BMP: 42 4D
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return 'image/bmp';
    }

    return null;
  }

  /**
   * Convert a URL or data URL to base64 format
   * Handles both data URLs and regular URLs (fetches and converts)
   */
  private async urlToBase64(imageUrl: string): Promise<{ mimeType: string; base64Data: string }> {
    // If it's already a data URL, extract the parts
    const base64Match = /^data:([^;]+);base64,(.+)$/.exec(imageUrl);
    if (base64Match) {
      return {
        mimeType: base64Match[1],
        base64Data: base64Match[2],
      };
    }

    // If it's a regular URL, fetch and convert to base64
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/')) {
      console.log('📥 Fetching image from URL:', `${imageUrl.substring(0, 100)}...`);

      // Handle relative URLs
      const fetchUrl = imageUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${imageUrl}` : imageUrl;

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      // Get MIME type - try multiple sources for reliability
      let mimeType = response.headers.get('content-type');

      // If content-type is generic/missing, try to detect from extension or binary data
      if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') {
        const fromExtension = this.getMimeTypeFromExtension(imageUrl);
        const fromBuffer = this.getMimeTypeFromBuffer(arrayBuffer);
        mimeType = fromBuffer ?? fromExtension ?? 'image/png';
        console.log(`🔍 Detected MIME type: ${mimeType} (from ${fromBuffer ? 'binary' : fromExtension ? 'extension' : 'default'})`);
      }

      return { mimeType, base64Data };
    }

    throw new Error(`Invalid image URL format. Expected data URL or http(s) URL, got: ${imageUrl.substring(0, 50)}...`);
  }

  /**
   * Edit image using Gemini's generateContent API with multimodal input
   */
  private async editImageWithGemini(
    baseImageDataUrl: string,
    editPrompt: string,
    primaryModel: string,
    fallbackModel: string
  ): Promise<EditImageResponse> {
    console.log('🚀 Sending edit request to Gemini...');
    console.log('📷 Base image URL type:', `${baseImageDataUrl.substring(0, 50)}...`);

    const imageClient = this.vertexClient ?? this.client;
    const modelName = this.vertexClient ? normalizeVertexModelName(primaryModel) : primaryModel;

    // Convert URL to base64 (handles both data URLs and regular URLs)
    const { mimeType, base64Data } = await this.urlToBase64(baseImageDataUrl);

    try {
      const response = await imageClient.models.generateContent({
        model: modelName,
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
              { text: editPrompt },
            ],
          },
        ],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      // Extract edited image from response
      if (response.candidates && response.candidates.length > 0) {
        for (const candidate of response.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if ('inlineData' in part && part.inlineData?.data) {
                const resultMimeType = part.inlineData.mimeType ?? 'image/png';
                console.log('✅ Image editing complete with Gemini');
                return {
                  editedImageDataUrl: `data:${resultMimeType};base64,${part.inlineData.data}`,
                };
              }
            }
          }
        }
      }

      // No image in response - try fallback Gemini model
      if (fallbackModel && fallbackModel !== primaryModel) {
        console.warn(`⚠️ No image from ${primaryModel}, trying fallback ${fallbackModel}`);
        const fallbackModelName = this.vertexClient ? normalizeVertexModelName(fallbackModel) : fallbackModel;
        const fallbackResponse = await imageClient.models.generateContent({
          model: fallbackModelName,
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
                { text: editPrompt },
              ],
            },
          ],
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        });

        if (fallbackResponse.candidates && fallbackResponse.candidates.length > 0) {
          for (const candidate of fallbackResponse.candidates) {
            if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                if ('inlineData' in part && part.inlineData?.data) {
                  const resultMimeType = part.inlineData.mimeType ?? 'image/png';
                  console.log('✅ Image editing complete with fallback Gemini model');
                  return {
                    editedImageDataUrl: `data:${resultMimeType};base64,${part.inlineData.data}`,
                  };
                }
              }
            }
          }
        }
      }

      throw new Error(ERROR_MESSAGES.NO_IMAGE_DATA);
    } catch (error) {
      console.error('❌ Gemini edit failed:', error);

      // Try fallback Gemini model
      if (fallbackModel && fallbackModel !== primaryModel) {
        console.warn(`⚠️ Falling back to ${fallbackModel}`);
        try {
          const fallbackModelName = this.vertexClient ? normalizeVertexModelName(fallbackModel) : fallbackModel;
          const fallbackResponse = await imageClient.models.generateContent({
            model: fallbackModelName,
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
                  { text: editPrompt },
                ],
              },
            ],
            config: {
              responseModalities: ['IMAGE', 'TEXT'],
            },
          });

          if (fallbackResponse.candidates && fallbackResponse.candidates.length > 0) {
            for (const candidate of fallbackResponse.candidates) {
              if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                  if ('inlineData' in part && part.inlineData?.data) {
                    const resultMimeType = part.inlineData.mimeType ?? 'image/png';
                    console.log('✅ Image editing complete with fallback Gemini model');
                    return {
                      editedImageDataUrl: `data:${resultMimeType};base64,${part.inlineData.data}`,
                    };
                  }
                }
              }
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback Gemini edit also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Generate images using Gemini Flash Image model via generateContent API
   * This method supports reference images and multi-turn editing
   */
  private async generateImagesWithGemini(
    request: GeminiGenerationRequest,
    primaryModel: string,
    aspectRatio: string,
    imageSize?: string
  ): Promise<GeminiGenerationResponse> {
    const imageCount = Math.max(1, request.count ?? 1);

    console.log(`🎨 GEMINI: Generating ${imageCount} images with ${primaryModel}...`);

    // Build prompt with any reference context
    const finalPrompt = request.prompt;

    const hasProductImages = (request.productImages?.length ?? 0) > 0 || (request.productImageUrls?.length ?? 0) > 0;
    const hasInspirationImages = (request.inspirationImages?.length ?? 0) > 0 || (request.inspirationImageUrls?.length ?? 0) > 0;

    if (hasProductImages) {
      const count = (request.productImages?.length ?? 0) + (request.productImageUrls?.length ?? 0);
      console.log(`📦 Including ${count} product reference images`);
    }

    if (hasInspirationImages) {
      const count = (request.inspirationImages?.length ?? 0) + (request.inspirationImageUrls?.length ?? 0);
      console.log(`✨ Including ${count} inspiration images`);
    }

    console.log(`📝 Final prompt: ${finalPrompt}`);
    console.log('🚀 Making Gemini generateContent API call...');

    const imageClient = this.vertexClient ?? this.client;
    const usedModel = primaryModel;

    // Build imageConfig for aspectRatio and imageSize (quality)
    const imageConfig =
      aspectRatio || imageSize
        ? {
            ...(aspectRatio && { aspectRatio }),
            ...(imageSize && { imageSize }),
          }
        : undefined;

    console.log('⚙️ Image config:', imageConfig);
    try {
      // Build content parts - text prompt and optional reference images
      const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Add product reference images (supports both File objects and URLs)
      if (request.productImages && request.productImages.length > 0) {
        for (const file of request.productImages) {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          contentParts.push({
            inlineData: {
              mimeType: file.type || 'image/png',
              data: base64,
            },
          });
        }
      }
      if (request.productImageUrls && request.productImageUrls.length > 0) {
        for (const url of request.productImageUrls) {
          try {
            const { mimeType, base64Data } = await this.urlToBase64(url);
            contentParts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
            console.log(`📷 Added product image from URL: ${url.substring(0, 60)}...`);
          } catch (err) {
            console.warn(`⚠️ Failed to fetch product image URL: ${url}`, err);
          }
        }
      }
      if (hasProductImages) {
        contentParts.push({ text: 'Use the above product images as reference for the items to include in the scene. ' });
      }

      // Add inspiration/style reference images (supports both File objects and URLs)
      if (request.inspirationImages && request.inspirationImages.length > 0) {
        for (const file of request.inspirationImages) {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          contentParts.push({
            inlineData: {
              mimeType: file.type || 'image/png',
              data: base64,
            },
          });
        }
      }
      if (request.inspirationImageUrls && request.inspirationImageUrls.length > 0) {
        for (const url of request.inspirationImageUrls) {
          try {
            const { mimeType, base64Data } = await this.urlToBase64(url);
            contentParts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
            console.log(`🎨 Added inspiration image from URL: ${url.substring(0, 60)}...`);
          } catch (err) {
            console.warn(`⚠️ Failed to fetch inspiration image URL: ${url}`, err);
          }
        }
      }
      if (hasInspirationImages) {
        contentParts.push({ text: 'Use the above images as style and composition inspiration. ' });
      }

      // Add the main prompt
      contentParts.push({ text: finalPrompt });

      // Generate with Gemini - request image output
      const modelName = this.vertexClient ? normalizeVertexModelName(usedModel) : usedModel;
      console.log('Using model:', modelName);
      const response = await imageClient.models.generateContent({
        model: modelName,
        contents: [{ parts: contentParts }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: imageConfig ? ({ imageConfig } as any) : undefined,
      });

      console.log('✅ Gemini API call completed');

      // Extract images from response
      const images: Array<{ url: string; format: string; width: number; height: number }> = [];

      if (response.candidates && response.candidates.length > 0) {
        for (const candidate of response.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              // Check for inline image data
              if ('inlineData' in part && part.inlineData?.data) {
                const mimeType = part.inlineData.mimeType ?? 'image/png';
                images.push({
                  url: `data:${mimeType};base64,${part.inlineData.data}`,
                  format: mimeType.split('/')[1] ?? 'png',
                  width: 1024,
                  height: 1024,
                });
              }
            }
          }
        }
      }

      if (images.length === 0) {
        console.warn('⚠️ No images in Gemini response');
        throw new Error(ERROR_MESSAGES.NO_IMAGE_DATA);
      }

      console.log(`✅ Generated ${images.length} image(s) with Gemini`);

      return {
        id: `gemini_flash_${Date.now()}`,
        images,
        metadata: {
          model: usedModel,
          prompt: finalPrompt,
          originalPrompt: request.prompt,
          generatedAt: new Date().toISOString(),
          cost: 0.039 * images.length, // Gemini Flash Image pricing
          fallback: false,
        },
      };
    } catch (error) {
      console.error(`❌ Gemini image generation failed:`, error);
      throw error;
    }
  }

  /**
   * Generate images using Gemini via @google/genai SDK
   * Enforces Gemini 3 model for 2K/4K image quality
   */
  async generateImages(request: GeminiGenerationRequest): Promise<GeminiGenerationResponse> {
    const aspectRatio = normalizeAspectRatio(request.aspectRatio);

    // Use model override if provided, otherwise fall back to instance defaults
    let primaryModel = request.modelOverrides?.imageModel ?? this.imageModel;

    // First check if high-res quality requires GEMINI_3
    const requestedQuality = request.imageQuality?.toUpperCase();
    const needsGemini3 = requestedQuality === '2K' || requestedQuality === '4K';

    if (needsGemini3 && primaryModel !== GEMINI_3_MODEL) {
      console.log(`📐 High-res (${requestedQuality}) requested - enforcing ${GEMINI_3_MODEL}`);
      primaryModel = GEMINI_3_MODEL;
    }

    // Now normalize imageSize - only meaningful for GEMINI_3
    const imageSize = primaryModel === GEMINI_3_MODEL ? normalizeImageSize(request.imageQuality) : undefined;

    console.log(`🎯 Requested model: ${primaryModel}`);
    console.log(`🖼️ Image size: ${imageSize ?? 'default'}`);

    return this.generateImagesWithGemini(request, primaryModel, aspectRatio, imageSize);
  }

  /**
   * Generate a single video using Gemini video generation API.
   * Uses exponential backoff for polling to reduce API calls.
   */
  async generateVideo(request: GeminiVideoRequest): Promise<GeminiVideoResponse> {
    const operationName = await this.startVideoGeneration(request);
    let result: GeminiVideoResponse | null = null;

    // Exponential backoff configuration
    const maxTimeoutMs = 10 * 60 * 1000; // 10 minutes
    const initialPollIntervalMs = 2000; // Start at 2 seconds
    const maxPollIntervalMs = 30000; // Cap at 30 seconds
    const backoffMultiplier = 1.5; // 1.5x increase each time
    const startTime = Date.now();

    let currentPollIntervalMs = initialPollIntervalMs;
    let pollCount = 0;

    while (!result) {
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs >= maxTimeoutMs) {
        throw new Error(`Video generation timed out after ${Math.round(elapsedMs / 1000)}s (operation: ${operationName})`);
      }

      // Exponential backoff: 2s, 3s, 4.5s, 6.75s, 10.1s, 15.2s, 22.8s, 30s (cap)
      await new Promise((resolve) => setTimeout(resolve, currentPollIntervalMs));

      result = await this.pollVideoGeneration({
        operationName,
        prompt: request.prompt,
        model: request.model,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
      });

      // Increase interval for next poll (capped at max)
      if (!result) {
        pollCount++;
        currentPollIntervalMs = Math.min(currentPollIntervalMs * backoffMultiplier, maxPollIntervalMs);
        console.log(`🎬 Video still processing... (poll #${pollCount}, next check in ${Math.round(currentPollIntervalMs / 1000)}s)`);
      }
    }

    console.log(`✅ Video completed after ${pollCount} polls in ${Math.round((Date.now() - startTime) / 1000)}s`);
    return result;
  }

  /**
   * Start a video generation operation and return the operation name.
   */
  async startVideoGeneration(request: GeminiVideoRequest): Promise<string> {
    const model = request.model ?? 'veo-3.1-generate-preview';
    const image = await normalizeImageInput(request.sourceImageUrl);
    const videoClient = this.vertexClient ?? this.client;
    const resolvedModel = this.vertexClient ? normalizeVertexModelName(model) : model;

    // Map resolution to Gemini's personGeneration format (if applicable)
    // Veo uses aspectRatio directly
    const aspectRatio = request.aspectRatio ?? '16:9';

    const prompt = buildVideoGenerationPrompt(request.prompt, {
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
    });

    console.log(`🎬 GEMINI: Starting video generation with ${resolvedModel}...`);
    console.log(`🎬 GEMINI: aspectRatio=${aspectRatio}, resolution=${request.resolution}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operation = await (videoClient.models as any).generateVideos({
      model: resolvedModel,
      prompt,
      image: {
        imageBytes: image.base64Data,
        mimeType: image.mimeType,
      },
      config: {
        numberOfVideos: 1,
        aspectRatio,
      },
    });

    const operationName = operation?.name;
    if (!operationName) {
      throw new Error('Video generation did not return an operation name.');
    }

    return operationName;
  }

  /**
   * Poll a video generation operation and return the video when complete.
   */
  async pollVideoGeneration(request: {
    operationName: string;
    prompt: string;
    model?: string;
    aspectRatio?: '16:9' | '9:16';
    resolution?: '720p' | '1080p';
  }): Promise<GeminiVideoResponse | null> {
    const videoClient = this.vertexClient ?? this.client;

    const operation = new GenerateVideosOperation();
    operation.name = request.operationName;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedOperation = await (videoClient.operations as any).getVideosOperation({ operation });

    if (!updatedOperation.done) {
      return null;
    }

    if (updatedOperation.error) {
      const errorObj = updatedOperation.error as Record<string, unknown>;
      const messageValue = errorObj.message;
      const message = typeof messageValue === 'string' ? messageValue : 'Video generation failed.';
      throw new Error(message);
    }

    const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('Video generation completed but no URI returned.');
    }

    const resolvedPrompt = buildVideoGenerationPrompt(request.prompt, {
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
    });
    const { buffer, mimeType } = await this.downloadGeneratedVideo(downloadLink);
    const resolvedModel = request.model ?? 'veo-3.1-generate-preview';

    return {
      id: `gemini_video_${Date.now()}`,
      videoBuffer: buffer,
      mimeType,
      metadata: {
        model: resolvedModel,
        prompt: resolvedPrompt,
        generatedAt: new Date().toISOString(),
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
      },
    };
  }

  private async downloadGeneratedVideo(downloadLink: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const apiKey = AI_CONFIG.gemini.apiKey;
    const headers: HeadersInit = {};
    let url = downloadLink;

    // Gemini video download expects the API key as a query parameter.
    if (apiKey && !downloadLink.includes('key=')) {
      const separator = downloadLink.includes('?') ? '&' : '?';
      url = `${downloadLink}${separator}key=${encodeURIComponent(apiKey)}`;
    }

    // Set up timeout (default 5 minutes for video downloads)
    const timeoutMs = 5 * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const videoResponse = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!videoResponse.ok) {
        // Include HTTP details in error message
        let errorDetails = `HTTP ${videoResponse.status} ${videoResponse.statusText}`;
        try {
          const errorText = await videoResponse.text();
          if (errorText) {
            errorDetails += `: ${errorText.substring(0, 200)}`;
          }
        } catch {
          // Ignore error reading response body
        }
        throw new Error(`Failed to download generated video: ${errorDetails}`);
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = videoResponse.headers.get('content-type') ?? 'video/mp4';

      return { buffer, mimeType };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Video download timed out after ${timeoutMs / 1000}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Enhance a video prompt using Gemini vision + text capabilities
   */
  async enhanceVideoPrompt(
    imageUrl: string,
    videoType?: string,
    settings?: {
      videoType?: string;
      cameraMotion?: string;
      aspectRatio?: '16:9' | '9:16';
      resolution?: '720p' | '1080p';
      sound?: 'with_music' | 'no_sound' | 'automatic' | 'custom';
      soundPrompt?: string;
    },
    userPrompt?: string
  ): Promise<string> {
    console.log('🎬 Enhancing video prompt:', `${imageUrl.substring(0, 100)}...`);

    const image = await normalizeImageInput(imageUrl);
    const imagePart = {
      inlineData: {
        data: image.base64Data,
        mimeType: image.mimeType,
      },
    };

    const resolvedVideoType = videoType ?? settings?.videoType;
    const lines: string[] = [];

    if (userPrompt?.trim()) {
      lines.push(`Base prompt: ${userPrompt.trim()}`);
    }
    if (resolvedVideoType) {
      lines.push(`Video type: ${resolvedVideoType}`);
    }
    if (settings?.cameraMotion) {
      lines.push(`Camera motion: ${settings.cameraMotion}`);
    }
    if (settings?.aspectRatio) {
      lines.push(`Aspect ratio: ${settings.aspectRatio}`);
    }
    if (settings?.resolution) {
      lines.push(`Resolution: ${settings.resolution}`);
    }
    if (settings?.sound) {
      if (settings.sound === 'custom' && settings.soundPrompt?.trim()) {
        lines.push(`Sound: ${settings.soundPrompt.trim()}`);
      } else if (settings.sound === 'with_music') {
        lines.push('Sound: with music');
      } else if (settings.sound === 'no_sound') {
        lines.push('Sound: no sound');
      } else if (settings.sound === 'automatic') {
        lines.push('Sound: automatic');
      } else {
        lines.push(`Sound: ${settings.sound}`);
      }
    }

    const context = lines.length > 0 ? lines.join('\n') : 'Base prompt: (none provided)';

    let response = await this.client.models
      .generateContent({
        model: this.resolveTextModel(this.textModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: `${VIDEO_PROMPT_ENHANCE_PROMPT}\n${context}` }, imagePart],
          },
        ],
      })
      .catch(async (error: unknown) => {
        if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel) {
          console.warn(`⚠️ Video prompt enhancement failed on ${this.textModel}, retrying with ${this.fallbackTextModel}...`);
          return this.client.models.generateContent({
            model: this.resolveTextModel(this.fallbackTextModel),
            contents: [
              {
                role: 'user',
                parts: [{ text: `${VIDEO_PROMPT_ENHANCE_PROMPT}\n${context}` }, imagePart],
              },
            ],
          });
        }
        throw error;
      });

    if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel && !response.text) {
      console.warn(`⚠️ No text returned by ${this.textModel}, retrying with fallback ${this.fallbackTextModel}...`);
      response = await this.client.models.generateContent({
        model: this.resolveTextModel(this.fallbackTextModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: `${VIDEO_PROMPT_ENHANCE_PROMPT}\n${context}` }, imagePart],
          },
        ],
      });
    }

    const text = response.text?.trim();
    if (text) {
      return text;
    }

    if (lines.length > 0) {
      return lines.join('\n');
    }

    return 'Cinematic video of the provided scene with smooth camera motion and natural lighting.';
  }

  /**
   * Analyze scene image using Gemini vision capabilities
   */
  async analyzeScene(imageUrl: string): Promise<SceneAnalysisResult> {
    console.log('🔍 Analyzing scene image:', `${imageUrl.substring(0, 100)}...`);

    const image = await normalizeImageInput(imageUrl);
    const imagePart = {
      inlineData: {
        data: image.base64Data,
        mimeType: image.mimeType,
      },
    };

    console.log('🚀 Sending scene to Gemini for analysis...');
    let response = await this.client.models
      .generateContent({
        model: this.resolveTextModel(this.textModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: SCENE_ANALYSIS_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      })
      .catch(async (error: unknown) => {
        if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel) {
          console.warn(`⚠️ Scene analysis failed on ${this.textModel}, retrying with ${this.fallbackTextModel}...`);
          return this.client.models.generateContent({
            model: this.resolveTextModel(this.fallbackTextModel),
            contents: [
              {
                role: 'user',
                parts: [{ text: SCENE_ANALYSIS_PROMPT }, imagePart],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });
        }
        throw error;
      });

    if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel && !response.text) {
      console.warn(`⚠️ No text returned by ${this.textModel}, retrying with fallback ${this.fallbackTextModel}...`);
      response = await this.client.models.generateContent({
        model: this.resolveTextModel(this.fallbackTextModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: SCENE_ANALYSIS_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const text = response.text ?? '';
    console.log('📝 Gemini response:', text);

    return JSON.parse(text);
  }

  /**
   * Analyze image components using Gemini vision capabilities
   */
  async analyzeComponents(imageUrl: string): Promise<ComponentAnalysisResult> {
    console.log('🔍 Analyzing image components:', `${imageUrl.substring(0, 100)}...`);

    const image = await normalizeImageInput(imageUrl);
    const imagePart = {
      inlineData: {
        data: image.base64Data,
        mimeType: image.mimeType,
      },
    };

    console.log('🚀 Sending image to Gemini for component analysis...');
    let response = await this.client.models
      .generateContent({
        model: this.resolveTextModel(this.textModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: COMPONENT_ANALYSIS_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      })
      .catch(async (error: unknown) => {
        if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel) {
          console.warn(`⚠️ Component analysis failed on ${this.textModel}, retrying with ${this.fallbackTextModel}...`);
          return this.client.models.generateContent({
            model: this.resolveTextModel(this.fallbackTextModel),
            contents: [
              {
                role: 'user',
                parts: [{ text: COMPONENT_ANALYSIS_PROMPT }, imagePart],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });
        }
        throw error;
      });

    if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel && !response.text) {
      console.warn(`⚠️ No text returned by ${this.textModel}, retrying with fallback ${this.fallbackTextModel}...`);
      response = await this.client.models.generateContent({
        model: this.resolveTextModel(this.fallbackTextModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: COMPONENT_ANALYSIS_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const text = response.text ?? '';
    console.log('📝 Gemini response:', text);

    return JSON.parse(text);
  }

  /**
   * Vision Scanner: Analyze inspiration/reference image for scene reconstruction
   */
  async analyzeInspirationImage(imageUrl: string): Promise<VisionScannerOutput> {
    console.log('🔍 Vision Scanner analyzing inspiration image:', `${imageUrl.substring(0, 100)}...`);

    const image = await normalizeImageInput(imageUrl);
    const imagePart = {
      inlineData: {
        data: image.base64Data,
        mimeType: image.mimeType,
      },
    };

    console.log('🚀 Sending inspiration image to Gemini for Vision Scanner analysis...');
    let response = await this.client.models
      .generateContent({
        model: this.resolveTextModel(this.textModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: VISION_SCANNER_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      })
      .catch(async (error: unknown) => {
        if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel) {
          console.warn(`⚠️ Vision Scanner failed on ${this.textModel}, retrying with ${this.fallbackTextModel}...`);
          return this.client.models.generateContent({
            model: this.resolveTextModel(this.fallbackTextModel),
            contents: [
              {
                role: 'user',
                parts: [{ text: VISION_SCANNER_PROMPT }, imagePart],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });
        }
        throw error;
      });

    if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel && !response.text) {
      console.warn(`⚠️ No text returned by ${this.textModel}, retrying with fallback ${this.fallbackTextModel}...`);
      response = await this.client.models.generateContent({
        model: this.resolveTextModel(this.fallbackTextModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: VISION_SCANNER_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const text = response.text ?? '';
    console.log('📝 Vision Scanner response:', text.substring(0, 500));

    return JSON.parse(text) as VisionScannerOutput;
  }

  /**
   * Subject Scanner: Analyze product image for taxonomy and constraints
   */
  async analyzeProductSubject(imageUrl: string): Promise<SubjectScannerOutput> {
    console.log('🔍 Subject Scanner analyzing product image:', `${imageUrl.substring(0, 100)}...`);

    const image = await normalizeImageInput(imageUrl);
    const imagePart = {
      inlineData: {
        data: image.base64Data,
        mimeType: image.mimeType,
      },
    };

    console.log('🚀 Sending product image to Gemini for Subject Scanner analysis...');
    let response = await this.client.models
      .generateContent({
        model: this.resolveTextModel(this.textModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: SUBJECT_SCANNER_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      })
      .catch(async (error: unknown) => {
        if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel) {
          console.warn(`⚠️ Subject Scanner failed on ${this.textModel}, retrying with ${this.fallbackTextModel}...`);
          return this.client.models.generateContent({
            model: this.resolveTextModel(this.fallbackTextModel),
            contents: [
              {
                role: 'user',
                parts: [{ text: SUBJECT_SCANNER_PROMPT }, imagePart],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });
        }
        throw error;
      });

    if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel && !response.text) {
      console.warn(`⚠️ No text returned by ${this.textModel}, retrying with fallback ${this.fallbackTextModel}...`);
      response = await this.client.models.generateContent({
        model: this.resolveTextModel(this.fallbackTextModel),
        contents: [
          {
            role: 'user',
            parts: [{ text: SUBJECT_SCANNER_PROMPT }, imagePart],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const text = response.text ?? '';
    console.log('📝 Subject Scanner response:', text.substring(0, 500));

    return JSON.parse(text) as SubjectScannerOutput;
  }

  /**
   * Analyze product asset using Gemini vision capabilities
   */
  async analyzeProduct(asset: ProductAsset): Promise<ProductAnalysis> {
    try {
      const analysisPrompt = `JSON analysis of this product image:
{
  "materials": ["primary material 1", "material 2"],
  "colors": ["main color", "accent color"],
  "style": "design style",
  "suggestions": ["prop 1", "prop 2", "setting"]
}`;

      console.log('🔍 Analyzing product with ultra-efficient prompt...');

      const imageData = await fileToGenerativePart(asset.file);
      let response = await this.client.models
        .generateContent({
          model: this.resolveTextModel(this.textModel),
          contents: [
            {
              role: 'user',
              parts: [{ text: analysisPrompt }, imageData],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        })
        .catch(async (error: unknown) => {
          if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel) {
            console.warn(`⚠️ Product analysis failed on ${this.textModel}, retrying with ${this.fallbackTextModel}...`);
            return this.client.models.generateContent({
              model: this.resolveTextModel(this.fallbackTextModel),
              contents: [
                {
                  role: 'user',
                  parts: [{ text: analysisPrompt }, imageData],
                },
              ],
              config: {
                responseMimeType: 'application/json',
              },
            });
          }
          throw error;
        });

      if (this.fallbackTextModel && this.fallbackTextModel !== this.textModel && !response.text) {
        console.warn(`⚠️ No text returned by ${this.textModel}, retrying with fallback ${this.fallbackTextModel}...`);
        response = await this.client.models.generateContent({
          model: this.resolveTextModel(this.fallbackTextModel),
          contents: [
            {
              role: 'user',
              parts: [{ text: analysisPrompt }, imageData],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      const text = response.text ?? '';

      console.log(`💰 Analysis tokens used: ~${estimateTokenUsage(text)}`);

      try {
        const parsed = JSON.parse(text);
        return {
          materials: Array.isArray(parsed.materials) ? parsed.materials.slice(0, 3) : ['modern materials'],
          colors: Array.isArray(parsed.colors) ? parsed.colors.slice(0, 3) : ['neutral tones'],
          style: typeof parsed.style === 'string' ? parsed.style : 'contemporary',
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : ['clean lighting', 'minimal props'],
        };
      } catch {
        console.warn('⚠️ JSON parse failed, using intelligent defaults to avoid re-run costs');
        const textLower = text.toLowerCase();

        const materials = extractMaterials(textLower);
        const colors = extractColors(textLower);
        const style = extractStyle(textLower);

        return {
          materials: materials.length > 0 ? materials : ['contemporary'],
          colors: colors.length > 0 ? colors : ['neutral'],
          style: style || 'modern',
          suggestions: ['professional lighting', 'clean background', 'minimal props'],
        };
      }
    } catch (error) {
      console.error('💸 Product analysis failed, using defaults to avoid additional costs:', error);
      return getDefaultAnalysisFromFileName(asset.file.name);
    }
  }
}

// Cached singleton instance - avoids re-initialization on every API route
let cachedService: GeminiService | null = null;

/**
 * Get the shared GeminiService instance.
 * Creates a new instance on first call, then returns the cached instance.
 */
export function getGeminiService(): GeminiService {
  cachedService ??= new GeminiService();
  return cachedService;
}
