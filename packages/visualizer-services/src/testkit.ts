/**
 * Services Testkit
 *
 * Provides mock AI services for testing without real API calls.
 * Configurable delays, failures, and rate limiting simulation.
 *
 * @example
 * ```ts
 * import { createMockGeminiService, MockGeminiService } from 'visualizer-services/testkit';
 *
 * const gemini = createMockGeminiService({ responseDelayMs: 100 });
 * const result = await gemini.generateImages({ prompt: 'test', count: 2 });
 * expect(result.images).toHaveLength(2);
 * ```
 */

import type {
  EditImageRequest,
  EditImageResponse,
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  SceneAnalysisResult,
  ComponentAnalysisResult,
} from './gemini/types';
import type { ProductAnalysisResult } from './product-analysis/types';

// ============================================================================
// TEST DATA
// ============================================================================

/** 1x1 red PNG pixel as base64 */
export const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

/** 1x1 red PNG pixel as data URL */
export const TEST_IMAGE_DATA_URL = `data:image/png;base64,${TEST_IMAGE_BASE64}`;

// ============================================================================
// MOCK CONFIGURATION
// ============================================================================

export interface MockGeminiConfig {
  /** Delay in ms before responding (default: 50) */
  responseDelayMs?: number;
  /** Probability of failure 0-1 (default: 0) */
  failureProbability?: number;
  /** Simulate rate limiting after N requests (default: undefined = no limit) */
  rateLimitAfter?: number;
  /** Custom image data to return */
  imageData?: string;
  /** Custom error message for failures */
  errorMessage?: string;
  /** Track all requests for assertions */
  trackRequests?: boolean;
}

interface TrackedRequest {
  method: string;
  args: unknown[];
  timestamp: number;
}

// ============================================================================
// MOCK GEMINI SERVICE
// ============================================================================

export class MockGeminiService {
  private config: Required<MockGeminiConfig>;
  private requestCount = 0;
  private requests: TrackedRequest[] = [];

  constructor(config: MockGeminiConfig = {}) {
    this.config = {
      responseDelayMs: config.responseDelayMs ?? 50,
      failureProbability: config.failureProbability ?? 0,
      rateLimitAfter: config.rateLimitAfter ?? Infinity,
      imageData: config.imageData ?? TEST_IMAGE_DATA_URL,
      errorMessage: config.errorMessage ?? 'Mock API error',
      trackRequests: config.trackRequests ?? true,
    };
  }

  private async beforeRequest(method: string, args: unknown[]): Promise<void> {
    this.requestCount++;

    if (this.config.trackRequests) {
      this.requests.push({ method, args, timestamp: Date.now() });
    }

    // Simulate delay
    if (this.config.responseDelayMs > 0) {
      await new Promise((r) => setTimeout(r, this.config.responseDelayMs));
    }

    // Check rate limit
    if (this.requestCount > this.config.rateLimitAfter) {
      throw new Error('Rate limit exceeded (429)');
    }

    // Random failure
    if (Math.random() < this.config.failureProbability) {
      throw new Error(this.config.errorMessage);
    }
  }

  async generateImages(request: GeminiGenerationRequest): Promise<GeminiGenerationResponse> {
    await this.beforeRequest('generateImages', [request]);

    const count = request.count ?? 1;
    const images = Array.from({ length: count }, () => ({
      url: this.config.imageData,
      format: 'png',
      width: 1024,
      height: 1024,
    }));

    return {
      id: `mock-gen-${Date.now()}`,
      images,
      metadata: {
        model: 'mock-imagen-3',
        prompt: request.prompt,
        generatedAt: new Date().toISOString(),
        cost: 0.01 * count,
        tokensUsed: 100 * count,
        mock: true,
      },
    };
  }

  async editImage(request: EditImageRequest): Promise<EditImageResponse> {
    await this.beforeRequest('editImage', [request]);

    return {
      editedImageDataUrl: this.config.imageData,
    };
  }

  async analyzeSceneFromUrl(imageUrl: string): Promise<SceneAnalysisResult> {
    await this.beforeRequest('analyzeSceneFromUrl', [imageUrl]);

    return {
      sceneType: 'Living Room',
      style: 'Modern Minimalist',
      lighting: 'Natural Daylight',
      cameraAngle: 'Front',
      surroundings: 'Minimal (No Props)',
      colorScheme: 'Neutral',
      props: ['Lush Greenery', 'Designer Rugs'],
      promptText: 'A modern living room with clean lines and natural light.',
    };
  }

  async analyzeComponents(imageSource: string | File): Promise<ComponentAnalysisResult> {
    await this.beforeRequest('analyzeComponents', [imageSource]);

    return {
      components: [
        { id: '1', name: 'floor', description: 'hardwood flooring in light oak tone' },
        { id: '2', name: 'wall', description: 'off-white painted wall' },
        { id: '3', name: 'sofa', description: 'gray modern sectional sofa' },
      ],
      overallDescription: 'A modern living room with natural lighting',
      suggestedAdjustments: [
        {
          id: '1',
          label: 'Brighten the image',
          description: 'The scene appears slightly underexposed',
          prompt: 'Brighten the overall image exposure',
          icon: 'sun',
          category: 'lighting',
        },
      ],
    };
  }

  // ============================================================================
  // TEST UTILITIES
  // ============================================================================

  /** Get total request count */
  getRequestCount(): number {
    return this.requestCount;
  }

  /** Get all tracked requests */
  getRequests(): TrackedRequest[] {
    return [...this.requests];
  }

  /** Get requests by method name */
  getRequestsByMethod(method: string): TrackedRequest[] {
    return this.requests.filter((r) => r.method === method);
  }

  /** Check if a method was called */
  wasCalled(method: string): boolean {
    return this.requests.some((r) => r.method === method);
  }

  /** Reset all counters and tracking */
  reset(): void {
    this.requestCount = 0;
    this.requests = [];
  }

  /** Update configuration */
  configure(config: Partial<MockGeminiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Enable rate limiting after N requests */
  setRateLimit(afterRequests: number): void {
    this.config.rateLimitAfter = afterRequests;
  }

  /** Set failure probability */
  setFailureProbability(probability: number): void {
    this.config.failureProbability = probability;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new mock Gemini service
 */
export function createMockGeminiService(config?: MockGeminiConfig): MockGeminiService {
  return new MockGeminiService(config);
}

// Singleton for convenience
let _mockGemini: MockGeminiService | null = null;

/**
 * Get or create singleton mock Gemini service
 */
export function getMockGeminiService(config?: MockGeminiConfig): MockGeminiService {
  if (!_mockGemini || config) {
    _mockGemini = new MockGeminiService(config);
  }
  return _mockGemini;
}

/**
 * Reset the singleton mock Gemini service
 */
export function resetMockGeminiService(): void {
  if (_mockGemini) {
    _mockGemini.reset();
  }
}

// ============================================================================
// MOCK PRODUCT ANALYSIS SERVICE
// ============================================================================

export class MockProductAnalysisService {
  private config: MockGeminiConfig;
  private requests: TrackedRequest[] = [];

  constructor(config: MockGeminiConfig = {}) {
    this.config = {
      responseDelayMs: config.responseDelayMs ?? 50,
      failureProbability: config.failureProbability ?? 0,
      rateLimitAfter: config.rateLimitAfter ?? Infinity,
      imageData: config.imageData ?? TEST_IMAGE_DATA_URL,
      errorMessage: config.errorMessage ?? 'Mock API error',
      trackRequests: config.trackRequests ?? true,
    };
  }

  async analyzeProduct(input: {
    productId: string;
    name: string;
    description?: string;
    imageUrl?: string;
  }): Promise<ProductAnalysisResult> {
    if (this.config.trackRequests) {
      this.requests.push({ method: 'analyzeProduct', args: [input], timestamp: Date.now() });
    }

    if (this.config.responseDelayMs! > 0) {
      await new Promise((r) => setTimeout(r, this.config.responseDelayMs));
    }

    return {
      productId: input.productId,
      sceneType: 'Living Room',
      productType: 'Furniture',
      style: ['Modern', 'Minimalist'],
      materials: ['Wood', 'Fabric'],
      colors: { primary: '#808080', accent: ['#FFFFFF'] },
      suggestedsceneTypes: ['Living Room', 'Office'],
      suggestedStyles: ['Modern Minimalist', 'Scandinavian'],
      promptKeywords: ['modern', 'sleek', 'comfortable'],
      confidence: 0.85,
    };
  }

  async analyzeBatch(
    products: Array<{ productId: string; name: string; description?: string; imageUrl?: string }>
  ): Promise<{ results: ProductAnalysisResult[]; errors: Array<{ productId: string; error: string }> }> {
    const results: ProductAnalysisResult[] = [];
    const errors: Array<{ productId: string; error: string }> = [];

    for (const product of products) {
      try {
        const result = await this.analyzeProduct(product);
        results.push(result);
      } catch (err) {
        errors.push({ productId: product.productId, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return { results, errors };
  }

  getRequests(): TrackedRequest[] {
    return [...this.requests];
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Create a mock product analysis service
 */
export function createMockProductAnalysisService(config?: MockGeminiConfig): MockProductAnalysisService {
  return new MockProductAnalysisService(config);
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that generateImages was called with specific prompt
 */
export function assertGenerateImagesCalled(service: MockGeminiService, expected?: { prompt?: string; count?: number }): void {
  const calls = service.getRequestsByMethod('generateImages');

  if (calls.length === 0) {
    throw new Error('Expected generateImages to be called but it was not');
  }

  if (expected) {
    const lastCall = calls[calls.length - 1];
    const request = lastCall.args[0] as GeminiGenerationRequest;

    if (expected.prompt && !request.prompt.includes(expected.prompt)) {
      throw new Error(`Expected prompt to contain "${expected.prompt}" but got "${request.prompt}"`);
    }

    if (expected.count && request.count !== expected.count) {
      throw new Error(`Expected count ${expected.count} but got ${request.count}`);
    }
  }
}

/**
 * Assert that editImage was called
 */
export function assertEditImageCalled(service: MockGeminiService): void {
  if (!service.wasCalled('editImage')) {
    throw new Error('Expected editImage to be called but it was not');
  }
}

/**
 * Assert total API call count
 */
export function assertCallCount(service: MockGeminiService, expected: number): void {
  const actual = service.getRequestCount();
  if (actual !== expected) {
    throw new Error(`Expected ${expected} API calls but got ${actual}`);
  }
}
