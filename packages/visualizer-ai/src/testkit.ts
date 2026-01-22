/**
 * Visualizer AI Testkit
 *
 * Provides mock implementations of AI services for testing.
 * Generates predictable mock images/videos without calling actual APIs.
 *
 * @example
 * ```ts
 * import { createMockGeminiService, setGeminiServiceMock } from 'visualizer-ai/testkit';
 *
 * const mockService = createMockGeminiService();
 * setGeminiServiceMock(mockService);
 *
 * // Now any code calling getGeminiService() will get the mock
 * const result = await mockService.generateImages({ prompt: 'test' });
 * ```
 */

import type {
  GeminiGenerationRequest,
  GeminiGenerationResponse,
  GeminiVideoRequest,
  GeminiVideoResponse,
  EditImageRequest,
  EditImageResponse,
  ComponentAnalysisResult,
  SceneAnalysisResult,
  ProductAnalysis,
  ProductAsset,
} from './types';

// ============================================================================
// TEST IMAGE DATA
// ============================================================================

/** 1x1 red PNG pixel - smallest valid PNG */
export const TEST_IMAGE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

/** 1x1 red PNG as data URL */
export const TEST_IMAGE_DATA_URL = `data:image/png;base64,${TEST_IMAGE_PNG_BASE64}`;

/** 10x10 blue test image - slightly larger for visual testing */
export const TEST_IMAGE_BLUE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP4gC/yLRqy+AAAAAElFTkSuQmCC';

export const TEST_IMAGE_BLUE_DATA_URL = `data:image/png;base64,${TEST_IMAGE_BLUE_BASE64}`;

/** Minimal MP4 video header for mock video responses */
const TEST_VIDEO_MP4_HEADER = Buffer.from([
  0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x61, 0x76, 0x63, 0x31,
]);

// ============================================================================
// TRACKING
// ============================================================================

export interface AIOperation {
  type: 'generateImages' | 'editImage' | 'startVideo' | 'pollVideo' | 'analyzeComponents' | 'analyzeScene' | 'analyzeProduct';
  request: unknown;
  response: unknown;
  timestamp: number;
  duration: number;
}

class AIOperationTracker {
  private operations: AIOperation[] = [];

  record(op: Omit<AIOperation, 'timestamp'>): void {
    this.operations.push({ ...op, timestamp: Date.now() });
  }

  getOperations(): AIOperation[] {
    return [...this.operations];
  }

  getByType(type: AIOperation['type']): AIOperation[] {
    return this.operations.filter((op) => op.type === type);
  }

  getImageGenerations(): AIOperation[] {
    return this.getByType('generateImages');
  }

  getImageEdits(): AIOperation[] {
    return this.getByType('editImage');
  }

  getVideoOperations(): AIOperation[] {
    return [...this.getByType('startVideo'), ...this.getByType('pollVideo')];
  }

  getCount(): number {
    return this.operations.length;
  }

  clear(): void {
    this.operations = [];
  }
}

// ============================================================================
// MOCK GEMINI SERVICE
// ============================================================================

export interface MockGeminiServiceConfig {
  /** Delay before returning mock responses (simulates API latency) */
  latencyMs?: number;
  /** Custom image to return instead of default test image */
  mockImageDataUrl?: string;
  /** Whether video polling should return complete immediately */
  videoCompleteImmediately?: boolean;
  /** Number of poll calls before video completes (if not immediate) */
  videoPollsUntilComplete?: number;
  /** Simulate errors for testing error handling */
  simulateErrors?: {
    generateImages?: boolean;
    editImage?: boolean;
    startVideo?: boolean;
    pollVideo?: boolean;
  };
}

export interface MockGeminiService {
  // Core methods (same interface as GeminiService)
  generateImages(request: GeminiGenerationRequest): Promise<GeminiGenerationResponse>;
  editImage(request: EditImageRequest): Promise<EditImageResponse>;
  startVideoGeneration(request: GeminiVideoRequest): Promise<string>;
  pollVideoGeneration(request: {
    operationName: string;
    prompt: string;
    model?: string;
    aspectRatio?: string;
    resolution?: string;
  }): Promise<GeminiVideoResponse | null>;
  analyzeComponents(imageDataUrl: string): Promise<ComponentAnalysisResult>;
  analyzeScene(imageDataUrl: string): Promise<SceneAnalysisResult>;
  analyzeProduct(assets: ProductAsset[]): Promise<ProductAnalysis>;

  // Test utilities
  tracker: AIOperationTracker;
  config: MockGeminiServiceConfig;
  reset(): void;

  // Video polling state
  _videoPollCount: Map<string, number>;
}

/**
 * Create a mock GeminiService for testing
 */
export function createMockGeminiService(config: MockGeminiServiceConfig = {}): MockGeminiService {
  const tracker = new AIOperationTracker();
  const videoPollCount = new Map<string, number>();

  const defaultConfig: Required<MockGeminiServiceConfig> = {
    latencyMs: config.latencyMs ?? 0,
    mockImageDataUrl: config.mockImageDataUrl ?? TEST_IMAGE_DATA_URL,
    videoCompleteImmediately: config.videoCompleteImmediately ?? true,
    videoPollsUntilComplete: config.videoPollsUntilComplete ?? 1,
    simulateErrors: config.simulateErrors ?? {},
  };

  async function delay(): Promise<void> {
    if (defaultConfig.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, defaultConfig.latencyMs));
    }
  }

  return {
    tracker,
    config: defaultConfig,
    _videoPollCount: videoPollCount,

    reset(): void {
      tracker.clear();
      videoPollCount.clear();
    },

    async generateImages(request: GeminiGenerationRequest): Promise<GeminiGenerationResponse> {
      const startTime = Date.now();
      await delay();

      if (defaultConfig.simulateErrors?.generateImages) {
        throw new Error('Mock error: generateImages failed');
      }

      const count = request.count ?? 1;
      const images = Array.from({ length: count }, (_, i) => ({
        url: defaultConfig.mockImageDataUrl,
        format: 'png',
        width: 1024,
        height: 1024,
      }));

      const response: GeminiGenerationResponse = {
        id: `mock_gen_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        images,
        metadata: {
          model: request.model ?? 'mock-model',
          prompt: request.prompt,
          generatedAt: new Date().toISOString(),
          originalPrompt: request.prompt,
          tokensUsed: 100,
          cost: 0.001,
          mock: true,
        },
      };

      tracker.record({
        type: 'generateImages',
        request,
        response,
        duration: Date.now() - startTime,
      });

      return response;
    },

    async editImage(request: EditImageRequest): Promise<EditImageResponse> {
      const startTime = Date.now();
      await delay();

      if (defaultConfig.simulateErrors?.editImage) {
        throw new Error('Mock error: editImage failed');
      }

      const response: EditImageResponse = {
        editedImageDataUrl: defaultConfig.mockImageDataUrl,
      };

      tracker.record({
        type: 'editImage',
        request,
        response,
        duration: Date.now() - startTime,
      });

      return response;
    },

    async startVideoGeneration(request: GeminiVideoRequest): Promise<string> {
      const startTime = Date.now();
      await delay();

      if (defaultConfig.simulateErrors?.startVideo) {
        throw new Error('Mock error: startVideoGeneration failed');
      }

      const operationName = `mock-video-op-${Date.now()}`;
      videoPollCount.set(operationName, 0);

      tracker.record({
        type: 'startVideo',
        request,
        response: { operationName },
        duration: Date.now() - startTime,
      });

      return operationName;
    },

    async pollVideoGeneration(request: {
      operationName: string;
      prompt: string;
      model?: string;
      aspectRatio?: string;
      resolution?: string;
    }): Promise<GeminiVideoResponse | null> {
      const startTime = Date.now();
      await delay();

      if (defaultConfig.simulateErrors?.pollVideo) {
        throw new Error('Mock error: pollVideoGeneration failed');
      }

      const currentPollCount = (videoPollCount.get(request.operationName) ?? 0) + 1;
      videoPollCount.set(request.operationName, currentPollCount);

      const isComplete =
        defaultConfig.videoCompleteImmediately || currentPollCount >= defaultConfig.videoPollsUntilComplete;

      if (!isComplete) {
        tracker.record({
          type: 'pollVideo',
          request,
          response: null,
          duration: Date.now() - startTime,
        });
        return null;
      }

      const response: GeminiVideoResponse = {
        id: `mock_video_${Date.now()}`,
        videoBuffer: TEST_VIDEO_MP4_HEADER,
        mimeType: 'video/mp4',
        metadata: {
          model: request.model ?? 'mock-video-model',
          prompt: request.prompt,
          generatedAt: new Date().toISOString(),
          aspectRatio: (request.aspectRatio as '16:9' | '9:16') ?? '16:9',
          resolution: (request.resolution as '720p' | '1080p') ?? '720p',
        },
      };

      tracker.record({
        type: 'pollVideo',
        request,
        response,
        duration: Date.now() - startTime,
      });

      return response;
    },

    async analyzeComponents(imageDataUrl: string): Promise<ComponentAnalysisResult> {
      const startTime = Date.now();
      await delay();

      const response: ComponentAnalysisResult = {
        components: [
          { id: '1', name: 'floor', description: 'Mock hardwood flooring' },
          { id: '2', name: 'wall', description: 'Mock white wall' },
          { id: '3', name: 'furniture', description: 'Mock furniture piece' },
        ],
        overallDescription: 'Mock scene analysis for testing',
        suggestedAdjustments: [
          {
            id: 'adj1',
            label: 'Brighten image',
            description: 'Mock adjustment suggestion',
            prompt: 'Increase brightness',
            icon: 'sun',
            category: 'lighting',
          },
        ],
      };

      tracker.record({
        type: 'analyzeComponents',
        request: { imageDataUrl },
        response,
        duration: Date.now() - startTime,
      });

      return response;
    },

    async analyzeScene(imageDataUrl: string): Promise<SceneAnalysisResult> {
      const startTime = Date.now();
      await delay();

      const response: SceneAnalysisResult = {
        sceneType: 'Living Room',
        style: 'Modern Minimalist',
        lighting: 'Natural Daylight',
        cameraAngle: 'Front',
        surroundings: 'Minimal (No Props)',
        colorScheme: 'Neutral',
        props: ['Mock Plant', 'Mock Lamp'],
        promptText: 'A mock scene analysis for testing purposes.',
      };

      tracker.record({
        type: 'analyzeScene',
        request: { imageDataUrl },
        response,
        duration: Date.now() - startTime,
      });

      return response;
    },

    async analyzeProduct(assets: ProductAsset[]): Promise<ProductAnalysis> {
      const startTime = Date.now();
      await delay();

      const response: ProductAnalysis = {
        materials: ['mock-material-1', 'mock-material-2'],
        colors: ['#FFFFFF', '#000000'],
        style: 'Modern',
        suggestions: ['Mock suggestion for product placement'],
      };

      tracker.record({
        type: 'analyzeProduct',
        request: { assets },
        response,
        duration: Date.now() - startTime,
      });

      return response;
    },
  };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that generateImages was called with specific parameters
 */
export function assertImageGenerated(mock: MockGeminiService, options?: { prompt?: string; count?: number }): void {
  const generations = mock.tracker.getImageGenerations();
  if (generations.length === 0) {
    throw new Error('Expected generateImages to be called, but it was not');
  }

  if (options?.prompt) {
    const hasMatch = generations.some((op) => {
      const req = op.request as GeminiGenerationRequest;
      return req.prompt.includes(options.prompt!);
    });
    if (!hasMatch) {
      throw new Error(`Expected prompt to contain "${options.prompt}"`);
    }
  }

  if (options?.count !== undefined) {
    if (generations.length !== options.count) {
      throw new Error(`Expected ${options.count} image generations, got ${generations.length}`);
    }
  }
}

/**
 * Assert that editImage was called
 */
export function assertImageEdited(mock: MockGeminiService, options?: { promptContains?: string }): void {
  const edits = mock.tracker.getImageEdits();
  if (edits.length === 0) {
    throw new Error('Expected editImage to be called, but it was not');
  }

  if (options?.promptContains) {
    const hasMatch = edits.some((op) => {
      const req = op.request as EditImageRequest;
      return req.prompt.includes(options.promptContains!);
    });
    if (!hasMatch) {
      throw new Error(`Expected edit prompt to contain "${options.promptContains}"`);
    }
  }
}

/**
 * Assert the total number of AI operations
 */
export function assertOperationCount(mock: MockGeminiService, expected: number): void {
  const actual = mock.tracker.getCount();
  if (actual !== expected) {
    throw new Error(`Expected ${expected} AI operations, got ${actual}`);
  }
}

/**
 * Assert no errors occurred (all operations completed)
 */
export function assertNoErrors(mock: MockGeminiService): void {
  const ops = mock.tracker.getOperations();
  for (const op of ops) {
    if (op.response instanceof Error) {
      throw new Error(`AI operation ${op.type} failed: ${op.response.message}`);
    }
  }
}
