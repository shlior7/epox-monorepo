import type { ImageConfig } from '@google/genai';
import { GoogleGenAI } from '@google/genai';
import { createDefaultConfig, AI_MODELS, ERROR_MESSAGES, estimateTokenUsage } from 'visualizer-ai';
import type { ProductAnalysis, ProductAsset } from 'visualizer-ai';
const AI_CONFIG = createDefaultConfig();

/** Gemini 3 model ID - required for 2K/4K image generation */
const GEMINI_3_MODEL = 'gemini-3-pro-image-preview';
import type {
  ComponentAnalysisResult,
  EditImageRequest,
  EditImageResponse,
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  SceneAnalysisResult,
  SubjectScannerOutput,
  VisionScannerOutput,
} from './types';
import {
  extractColors,
  extractMaterials,
  extractStyle,
  fileToGenerativePart,
  getDefaultAnalysisFromFileName,
  normalizeImageInput,
} from './utils';

const COMPONENT_ANALYSIS_PROMPT = `Analyze this image and identify all the distinct visual components/elements in it.

For each component, provide a simple one or two word name (like: bed, rug, floor, wall, plant, lamp, sofa, table, chair, curtain, pillow, artwork, vase, shelf, window, ceiling, door, cabinet, etc.)

Also analyze the image quality and suggest improvements for lighting, color, and overall appearance.

Your response must be a valid JSON object with this structure:

{
  "components": [
    { "id": "1", "name": "floor", "description": "hardwood flooring in light oak tone", "centerPoint": { "x": 500, "y": 800 }, "context": "concrete subfloor or lower surface not visible" },
    { "id": "2", "name": "wall", "description": "off-white painted wall", "centerPoint": { "x": 500, "y": 300 }, "context": "structural wall behind, not removable" },
    { "id": "3", "name": "sofa", "description": "gray modern sectional sofa", "centerPoint": { "x": 400, "y": 550 }, "context": "hardwood floor and back wall visible behind and underneath" }
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
- centerPoint: estimate the center of the component on a 0-1000 scale (0,0 = top-left, 1000,1000 = bottom-right)
- context: describe what is behind or underneath the component — what would be revealed if this object were removed (e.g., "wooden floor and white wall", "garden visible through window")

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

// ===== VISION SCANNER PROMPT (for inspiration image analysis) =====
const VISION_SCANNER_PROMPT = `You are a Forensic Interior Architecture Scanner. Your goal is to analyze the input image and extract a structured inventory of visual elements for a generative 3D reconstruction pipeline.

### CRITICAL INSTRUCTIONS
1. **NO SUMMARIZATION:** Do not describe the "vibe." Break the scene down into atomic elements.
2. **STRICT JSON OUTPUT:** You must output ONLY valid JSON. No markdown formatting, no conversational text.
3. **UNIVERSAL SCANNING:** Detect every major surface, prop, and light source.
4. **STYLING DETECTION:** Explicitly look for accessories placed ON the main furniture/subject in the reference (e.g., throw blankets, pillows, open books) and extract them separately.

### OUTPUT SCHEMA (JSON)
{
  "styleSummary": "A concise, one-sentence visual hook describing the overall vibe (e.g., 'A serene, cream-white Japandi bedroom with soft organic curves.')",
  "detectedSceneType": "The type of scene/room detected (e.g., 'Bedroom', 'Living-Room', 'Office', 'Kitchen', 'Garden', 'Studio'). Use hyphenated format for multi-word types.",
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

// ===== SUBJECT SCANNER PROMPT (for product image analysis) =====
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

const normalizeImageSize = (value?: string, model?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.toUpperCase();

  if (model !== GEMINI_3_MODEL) {
    return undefined;
  }

  return normalized === '1K' || normalized === '2K' || normalized === '4K' ? normalized : undefined;
};

const normalizeVertexModelName = (model: string): string => {
  if (model.startsWith('projects/') || model.startsWith('publishers/')) {
    return model;
  }
  return `publishers/google/models/${model}`;
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

      // Support service account credentials from environment variable (for Vercel/production)
      // GOOGLE_SERVICE_ACCOUNT_KEY should contain the JSON key as a string
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        try {
          const credentials = JSON.parse(serviceAccountKey);
          this.vertexClient = new GoogleGenAI({
            vertexai: true,
            project: vertexProject,
            location: vertexLocation,
            googleAuthOptions: {
              credentials,
            },
          });
          console.log('🔐 Using service account credentials for Vertex AI');
        } catch (e) {
          console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
          throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON format');
        }
      } else {
        // Fall back to Application Default Credentials (ADC) - works locally with gcloud auth
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
      const mimeType = response.headers.get('content-type') ?? 'image/png';

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

    if (request.productImages && request.productImages.length > 0) {
      console.log(`📦 Including ${request.productImages.length} product reference images`);
    }

    if (request.inspirationImages && request.inspirationImages.length > 0) {
      console.log(`✨ Including ${request.inspirationImages.length} inspiration images`);
    }

    console.log(`📝 Final prompt: ${finalPrompt}`);
    console.log('🚀 Making Gemini generateContent API call...');

    const imageClient = this.vertexClient ?? this.client;
    const usedModel = primaryModel;
    const imageConfig: ImageConfig | undefined =
      (imageSize ?? aspectRatio) ? { ...(aspectRatio && { aspectRatio }), ...(imageSize && { imageSize }) } : undefined;

    console.log('⚙️ Image config:', imageConfig);
    try {
      // Build content parts - text prompt and optional reference images
      const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Add reference images if provided (Gemini supports multimodal input)
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
        contentParts.push({ text: 'Use the above product images as reference. ' });
      }

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
        contentParts.push({ text: 'Use the above images as style/composition inspiration. ' });
      }

      // Add the main prompt
      contentParts.push({ text: finalPrompt });

      // Generate with Gemini - request image output
      // Note: Gemini generateContent produces one image per call, so we make multiple calls if needed
      const modelName = this.vertexClient ? normalizeVertexModelName(usedModel) : usedModel;
      console.log('Using model:', modelName);
      const response = await imageClient.models.generateContent({
        model: modelName,
        contents: [{ parts: contentParts }],
        config: {
          // responseModalities: ['IMAGE'],
          ...(imageConfig && { imageConfig }),
        },
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
    const imageSize = normalizeImageSize(request.imageQuality);

    // Use model override if provided, otherwise fall back to instance defaults
    let primaryModel = request.modelOverrides?.imageModel ?? this.imageModel;
    console.log(`🎯 Requested model: ${primaryModel}`);
    console.log(`🖼️ Requested image size: ${imageSize}`);

    // Enforce Gemini 3 for 2K/4K image quality
    if ((imageSize === '2K' || imageSize === '4K') && primaryModel !== GEMINI_3_MODEL) {
      console.log(`📐 High-res (${imageSize}) requested - enforcing ${GEMINI_3_MODEL}`);
      primaryModel = GEMINI_3_MODEL;
    }

    return this.generateImagesWithGemini(request, primaryModel, aspectRatio, imageSize);
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
      } catch (parseError) {
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

  /**
   * Vision Scanner: Analyze inspiration/reference image for scene reconstruction
   * Extracts structured inventory of visual elements for prompt engineering
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
   * Extracts product identity, compatible scene types, and camera angle
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
