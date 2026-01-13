# Visualizer Services

Shared business logic services for the visualizer platform. This package provides AI-powered image generation, product analysis, and visualization services that can be used across multiple apps.

## Features

- **Gemini AI Service**: Image generation, editing, and analysis using Google's Gemini models
- **Visualization Service**: Product visualization with cost-optimized generation
- **Smart Model Selection**: Automatic model selection based on task requirements and constraints
- **Type Definitions**: Comprehensive TypeScript types for all services

## Installation

```bash
yarn add visualizer-services
```

## Usage

### Gemini Service

```typescript
import { getGeminiService, createDefaultConfig } from 'visualizer-services';

// Initialize with default config (reads from env variables)
const gemini = getGeminiService();

// Generate images
const response = await gemini.generateImages({
  prompt: 'Modern living room with minimalist furniture',
  count: 1,
  aspectRatio: '16:9',
  imageQuality: '2K', // Automatically uses Gemini 3 for high-res
});

// Edit images
const edited = await gemini.editImage({
  baseImageDataUrl: 'data:image/png;base64,...',
  prompt: 'Make the lighting warmer',
});

// Analyze products
const analysis = await gemini.analyzeProduct({
  file: productImageFile,
  type: 'image',
});

// Analyze scenes
const sceneData = await gemini.analyzeScene(sceneImageUrl);
```

### Configuration

```typescript
import { createDefaultConfig, AIServiceConfig } from 'visualizer-services';

// Create custom configuration
const config: AIServiceConfig = {
  gemini: {
    apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
    imageModel: 'gemini-2.5-flash-image',
    editModel: 'gemini-3-pro-image-preview',
    fallbackImageModel: 'gemini-2.5-flash-image',
    textModel: 'gemini-2.5-flash-lite',
    fallbackTextModel: 'gemini-2.0-flash-lite',
  },
  optimization: {
    maxPromptTokens: 400,
    defaultImageCount: 1,
    defaultImageSize: '1K',
    defaultAspectRatio: '1:1',
    maxRetries: 2,
  },
};
```

### Smart Model Selection

```typescript
import { selectBestModel } from 'visualizer-services';

// Select best model based on context
const { recommended, alternatives, reason } = selectBestModel({
  task: 'generation_with_reference',
  hasReferenceImages: true,
  referenceImageCount: 3,
  preferQuality: true,
});

console.log(`Using ${recommended.name}: ${reason}`);
```

### Visualization Service

```typescript
import { getVisualizationService } from 'visualizer-services';

const service = getVisualizationService();

const session = await service.generateVisualization({
  productName: 'Modern Chair',
  location: 'Living Room',
  style: 'Modern Minimalist',
  lighting: 'Natural Daylight',
  camera: 'Front',
  cameraNotes: '3/4 view',
  props: 'Minimal',
  moodNotes: 'Clean and bright',
  aspectRatio: '16:9',
  resolution: '2K',
  variants: 3,
  magnify: false,
});
```

## Environment Variables

Required environment variables:

```bash
# Google AI API Key (required)
GOOGLE_AI_STUDIO_API_KEY=your-api-key

# Optional: Vertex AI configuration
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Architecture

### Core Services

- **GeminiService**: Low-level Gemini API wrapper with fallback support
- **VisualizationService**: High-level product visualization orchestration
- **Image Generation Types**: Core types for job-based generation (queue impl is app-specific)

### Design Principles

1. **Configuration Injection**: Services accept configuration rather than reading from global state
2. **Singleton Pattern**: Lazy-initialized singletons for service instances
3. **Type Safety**: Comprehensive TypeScript types for all APIs
4. **Cost Optimization**: Built-in cost tracking and optimization strategies
5. **Fallback Support**: Automatic fallback to alternative models on failure

### App-Specific Implementations

The following should be implemented per-app:

- **Queue Management**: Redis-based job queues for async generation
- **Storage Integration**: R2/S3 upload and download logic
- **Prompt Building**: App-specific prompt templating
- **Authentication**: API authentication and rate limiting

## Integration with Other Packages

```typescript
// Use with visualizer-db for data persistence
import { db } from 'visualizer-db';
import { getGeminiService } from 'visualizer-services';

// Use with visualizer-storage for image uploads
import { uploadFile } from 'visualizer-storage';
import { getGeminiService } from 'visualizer-services';

const gemini = getGeminiService();
const response = await gemini.generateImages({...});

// Convert data URL to blob and upload
const blob = await fetch(response.images[0].url).then(r => r.blob());
await uploadFile('path/to/image.jpg', blob);
```

## Examples

See the admin app (`apps/scenergy-visualizer`) for complete integration examples:

- API routes using services: `app/api/generate-images/route.ts`
- Queue implementation: `lib/services/image-generation/queue.ts` (app-specific)
- Prompt building: `lib/services/prompt-builder.ts` (app-specific)

## API Reference

See the TypeScript definitions in `src/` for complete API documentation. Key exports:

### Services
- `getGeminiService()`: Get Gemini service singleton
- `getVisualizationService()`: Get visualization service singleton
- `createDefaultConfig()`: Create default configuration from env

### Constants
- `AI_MODELS`: Supported AI model IDs
- `AVAILABLE_IMAGE_MODELS`: Available image generation models with capabilities
- `selectBestModel()`: Smart model selection helper

### Types
- `GeminiGenerationRequest/Response`: Image generation types
- `EditImageRequest/Response`: Image editing types
- `ProductAnalysis`: Product analysis result
- `ImageGenerationJob`: Job queue type (implement queue per-app)

## License

Private - Internal use only
