# visualizer-ai

Independent AI package for Gemini-based image generation and analysis.

## Purpose

This package contains all the AI/Gemini logic extracted from `visualizer-services` to be used independently in the AI worker Docker container without requiring all the other services (email, invitation, notification, etc.).

## Features

- 🎨 **Image Generation**: Generate images using Gemini Flash Image models
- ✏️ **Image Editing**: Edit images with Gemini's multimodal capabilities
- 🔍 **Scene Analysis**: Analyze interior scenes and extract style information
- 🧩 **Component Analysis**: Identify visual components in images
- 📦 **Product Analysis**: Analyze product images for materials, colors, and style
- ⚙️ **Model Selection**: Smart model selection based on task requirements
- 💰 **Cost Optimization**: Built-in cost optimization and fallback strategies

## Installation

```bash
yarn add visualizer-ai
```

## Usage

### Generate Images

```typescript
import { getGeminiService } from 'visualizer-ai';

const gemini = getGeminiService();

const response = await gemini.generateImages({
  prompt: 'A modern living room with a blue sofa',
  aspectRatio: '16:9',
  imageQuality: '2k',
  count: 1,
});

console.log('Generated:', response.images[0].url);
```

### Edit Images

```typescript
import { getGeminiService } from 'visualizer-ai';

const gemini = getGeminiService();

const response = await gemini.editImage({
  baseImageDataUrl: 'data:image/png;base64,...',
  prompt: 'Change the sofa color to red',
});

console.log('Edited:', response.editedImageDataUrl);
```

### Analyze Scenes

```typescript
import { getGeminiService } from 'visualizer-ai';

const gemini = getGeminiService();

const analysis = await gemini.analyzeScene('https://example.com/room.jpg');

console.log('Room type:', analysis.roomType);
console.log('Style:', analysis.style);
console.log('Lighting:', analysis.lighting);
```

## Environment Variables

```bash
# Required
GOOGLE_AI_STUDIO_API_KEY=your-api-key

# Optional - for Vertex AI
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Dependencies

- `@google/genai` - Official Google Generative AI SDK

## TypeScript Support

This package is written in TypeScript and includes full type definitions.

## License

Private - Internal use only
