---
name: Visualizer Client Studio
overview: Create `visualizer-client` - a magical, simplified AI studio for non-technical users to bulk-generate product visualizations. Users create collections by filtering products, provide up to 5 reference images for scene analysis, and the system intelligently generates hundreds of product images with automatic room/context matching.
todos:
  - id: create-shared-package
    content: Create packages/visualizer-shared with shared types and utilities
    status: pending
  - id: create-client-app
    content: Create apps/visualizer-client Next.js app with auth integration
    status: pending
    dependencies:
      - create-shared-package
  - id: implement-product-filter
    content: Build product filter UI (by category, room type) for collection creation
    status: pending
    dependencies:
      - create-client-app
  - id: build-reference-uploader
    content: Create reference image uploader (1-5 images) with preview
    status: pending
    dependencies:
      - create-client-app
  - id: implement-scene-analysis
    content: Build scene analysis service - single image + merged analysis
    status: pending
    dependencies:
      - build-reference-uploader
  - id: create-scene-preview
    content: UI to display AI scene analysis with editable attributes
    status: pending
    dependencies:
      - implement-scene-analysis
  - id: implement-room-matching
    content: Smart product-to-room matching logic (metadata + AI)
    status: pending
    dependencies:
      - create-scene-preview
  - id: build-generation-queue
    content: Collection generation queue with progress tracking
    status: pending
    dependencies:
      - implement-room-matching
  - id: create-results-gallery
    content: Gallery view for generated images with download/refine options
    status: pending
    dependencies:
      - build-generation-queue
---

# Visualizer Client - AI Product Studio

## Vision

A streamlined, magical studio experience for non-technical users to generate beautiful product visualizations at scale. The focus is on:

- **Minimal configuration** - AI does the heavy lifting
- **Collection-based workflow** - Bulk generation of 20-500+ products
- **Smart scene matching** - Products automatically placed in appropriate contexts
- **Reference-driven generation** - Up to 5 inspiration images analyzed to extract style/environment

## Core Workflow

```mermaid
flowchart TD
    subgraph step1 [Step 1: Create Collection]
        A[Filter Products] --> B[Select by Category/Room Type]
        B --> C[Preview Collection<br/>20-500 products]
    end
    
    subgraph step2 [Step 2: Set the Scene]
        D[Upload Reference Images<br/>0-5 images] --> E[AI Scene Analysis]
        E --> F[Extract: Colors, Style,<br/>Environment, Materials]
        F --> G[Merged Scene Summary]
    end
    
    subgraph step3 [Step 3: Configure]
        G --> H[Auto-Generated Settings]
        H --> I[User Review/Tweak<br/>Optional overrides]
    end
    
    subgraph step4 [Step 4: Generate]
        I --> J[Smart Room Assignment<br/>Metadata + AI]
        J --> K[Generation Queue<br/>20-500+ products]
        K --> L[Progress Dashboard]
        L --> M[Review & Refine]
    end
    
    step1 --> step2
    step2 --> step3
    step3 --> step4
```



## Scene Analysis Pipeline

When user uploads reference images:

```mermaid
sequenceDiagram
    participant U as User
    participant App as Client App
    participant AI as Gemini AI
    
    U->>App: Upload 1-5 reference images
    
    loop Each Image
        App->>AI: Analyze single image
        AI-->>App: Scene attributes:<br/>- Indoor/Outdoor<br/>- Room type hints<br/>- Color palette<br/>- Materials (floor, walls)<br/>- Lighting mood<br/>- Style (modern, rustic, etc.)
    end
    
    App->>AI: Merge all analyses
    AI-->>App: Unified scene config:<br/>- Primary environment<br/>- Color scheme<br/>- Material preferences<br/>- Style keywords
    
    App->>U: Show scene summary card<br/>with editable attributes
```



## Smart Product-to-Room Matching

For each product in the queue:| Product Type | Auto-Assigned Context ||--------------|----------------------|| Office desk, chair | Home office, corporate office || Bathroom sink, vanity | Bathroom || Rug, coffee table | Living room || Bed, mattress | Bedroom || Dining table | Dining room || Outdoor furniture | Patio, garden |Logic:

1. Check product metadata (category, roomTypes)
2. AI analyzes product image if metadata unclear
3. Match against reference scene (if compatible)
4. Fall back to logical default for product type

## App Structure

```javascript
apps/visualizer-client/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard - recent collections
│   ├── login/page.tsx
│   ├── collections/
│   │   ├── page.tsx                # List all collections
│   │   ├── new/
│   │   │   └── page.tsx            # Collection creation wizard
│   │   └── [collectionId]/
│   │       ├── page.tsx            # Collection detail/progress
│   │       └── results/page.tsx    # Generated images gallery
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── collections/
│       │   ├── route.ts            # CRUD collections
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── analyze/route.ts    # Scene analysis
│       │       └── generate/route.ts   # Start generation
│       └── products/route.ts       # Filter/list products
├── components/
│   ├── CollectionWizard/           # Multi-step creation flow
│   │   ├── ProductFilter.tsx       # Step 1: Filter products
│   │   ├── ReferenceUploader.tsx   # Step 2: Upload inspiration
│   │   ├── ScenePreview.tsx        # Show AI analysis results
│   │   ├── ConfigReview.tsx        # Step 3: Review settings
│   │   └── GenerateButton.tsx      # Step 4: Launch
│   ├── GenerationProgress/         # Real-time queue status
│   └── ResultsGallery/             # View/download results
└── lib/
    ├── auth/client-auth.ts
    ├── services/
    │   └── scene-analyzer.ts       # Multi-image analysis
    └── types/collection.ts
```



## Data Model

```typescript
interface Collection {
  id: string;
  clientId: string;
  name: string;
  status: 'draft' | 'analyzing' | 'ready' | 'generating' | 'completed';
  
  // Step 1: Products
  productFilter: {
    categories?: string[];
    roomTypes?: string[];
    productIds?: string[];  // Or explicit selection
  };
  productCount: number;
  
  // Step 2: Reference Images
  referenceImages: Array<{
    id: string;
    url: string;
    analysis?: SceneAnalysis;
  }>;
  
  // Step 3: Merged Scene Config
  sceneConfig: {
    environment: 'indoor' | 'outdoor' | 'mixed';
    colorPalette: string[];
    style: string[];
    materials: { floor?: string; walls?: string; };
    lighting: string;
    customPromptPrefix?: string;
  };
  
  // Step 4: Generation
  generationQueue: Array<{
    productId: string;
    assignedRoom: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
    resultImageId?: string;
  }>;
  
  createdAt: string;
  updatedAt: string;
}
```



## Key UX Principles

1. **Progressive Disclosure** - Only show complexity when needed
2. **Smart Defaults** - AI fills in sensible values, user just confirms
3. **Visual Feedback** - Show what the AI "sees" in reference images
4. **Bulk-First** - Designed for 100+ products, not one at a time
5. **Non-Technical Language** - "Warm lighting" not "temperature: 5500K"

## Shared Infrastructure

Still leverages existing packages:

- `visualizer-auth` - User authentication (Better Auth)
- `visualizer-db` - Database schemas
- `visualizer-storage` - S3 storage
- Gemini service for scene analysis and generation

New shared code goes to `visualizer-shared`:

- Generation queue logic