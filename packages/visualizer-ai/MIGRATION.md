# AI Package Migration Summary

## Overview

Successfully extracted all Gemini/AI logic from `visualizer-services` into an independent `visualizer-ai` package.

## What Was Created

### New Package: `visualizer-ai`

Located at: `packages/visualizer-ai/`

**Files Created:**

- `package.json` - Package configuration with minimal dependencies
- `tsconfig.json` - TypeScript configuration
- `src/constants.ts` - AI model constants and configurations
- `src/config.ts` - Configuration management
- `src/types.ts` - TypeScript type definitions
- `src/utils.ts` - Utility functions for file handling and analysis
- `src/gemini-service.ts` - Main Gemini service implementation
- `src/index.ts` - Package exports
- `README.md` - Documentation
- `MIGRATION.md` - This file

## Dependencies

The new package has **minimal dependencies**:

- `@google/generative-ai` - Official Google Generative AI SDK
- TypeScript dev dependencies only

**No longer requires:**

- Database packages
- Storage packages
- Email services
- Notification services
- Queue services
- Invitation services
- etc.

## What Was Updated

### 1. `packages/scenergy-queue/src/queue/worker.ts`

```typescript
// Before
import { getGeminiService } from 'visualizer-services';

// After
import { getGeminiService } from 'visualizer-ai';
```

### 2. `packages/scenergy-queue/package.json`

```json
{
  "dependencies": {
    "visualizer-ai": "1.0.0"
    // Removed: "visualizer-services": "1.0.0"
  }
}
```

### 3. `services/ai-worker/package.json`

```json
{
  "dependencies": {
    // Removed: "visualizer-services": "1.0.0"
    // Now gets AI functionality through scenergy-queue which uses visualizer-ai
  }
}
```

## Exported API

The `visualizer-ai` package exports:

### Services

- `GeminiService` - Main service class
- `getGeminiService()` - Singleton getter

### Types

- `GeminiGenerationRequest`
- `GeminiGenerationResponse`
- `EditImageRequest`
- `EditImageResponse`
- `ComponentAnalysisResult`
- `SceneAnalysisResult`
- `ProductAnalysis`
- `AIModelOverrides`
- And more...

### Constants

- `AI_MODELS` - Model IDs
- `AVAILABLE_IMAGE_MODELS` - Model configurations
- `DEFAULT_AI_MODEL_CONFIG` - Default settings
- `ERROR_MESSAGES` - Error constants

### Utils

- `fileToBase64()`
- `fileToGenerativePart()`
- `estimateTokenUsage()`
- `optimizePrompt()`
- `extractMaterials()`
- `extractColors()`
- `extractStyle()`
- And more...

## Benefits

1. **Smaller Docker Images**: AI worker no longer needs all service dependencies
2. **Faster Builds**: Fewer dependencies to install and compile
3. **Better Separation**: AI logic is isolated from business logic
4. **Easier Testing**: Can test AI functionality independently
5. **Clearer Dependencies**: Explicit about what the AI worker needs

## Usage in AI Worker

The AI worker now gets Gemini functionality through the queue worker:

```typescript
// In scenergy-queue/src/queue/worker.ts
import { getGeminiService } from 'visualizer-ai';

const gemini = getGeminiService();
const result = await gemini.generateImages({
  prompt: 'A modern living room',
  aspectRatio: '16:9',
  imageQuality: '2k',
});
```

## Environment Variables

Required for `visualizer-ai`:

```bash
GOOGLE_AI_STUDIO_API_KEY=your-api-key

# Optional - for Vertex AI
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Next Steps

1. ✅ Created `visualizer-ai` package
2. ✅ Updated `scenergy-queue` to use new package
3. ✅ Updated `ai-worker` dependencies
4. ⏳ Install dependencies: `yarn install` in root
5. ⏳ Test the worker: Ensure image generation still works
6. ⏳ Update Docker builds if needed

## Rollback Plan

If issues arise, you can temporarily revert:

1. In `packages/scenergy-queue/src/queue/worker.ts`:

   ```typescript
   import { getGeminiService } from 'visualizer-services';
   ```

2. In `packages/scenergy-queue/package.json`:

   ```json
   "visualizer-services": "1.0.0"
   ```

3. In `services/ai-worker/package.json`:
   ```json
   "visualizer-services": "1.0.0"
   ```

## Notes

- The original `visualizer-services` package still contains the Gemini code for backward compatibility
- Other parts of the system (web app, etc.) can continue using `visualizer-services`
- Only the AI worker benefits from the lighter `visualizer-ai` package
- Both packages can coexist during transition period
