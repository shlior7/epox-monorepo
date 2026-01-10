# Scene Studio Persistence Model

## Overview

Scene Studios are persistent workspaces (like sessions) that retain all their state:
- Output slots with products and configurations
- Generated images and revision history
- User-uploaded custom scenes
- Configuration settings per slot

## Data Structure

### SceneStudio
```typescript
interface SceneStudio {
  id: string;                      // Unique identifier
  name: string;                    // Display name
  clientId: string;                // Parent client reference
  outputSlots: OutputSlotConfig[]; // All generation rows
  userScenes?: Scene[];            // Custom uploaded scenes
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}
```

### OutputSlotConfig (Rows)
```typescript
interface OutputSlotConfig {
  id: string;                          // Slot identifier
  productIds: string[];                // Products in this slot
  status: SlotStatus;                  // EMPTY | GENERATING | COMPLETED | ERROR
  outputImage?: string;                // Currently displayed image
  history: GeneratedSceneImage[];      // All generated variations
  settings: SceneGenerationSettings;   // Full configuration
}
```

### GeneratedSceneImage (Revisions)
```typescript
interface GeneratedSceneImage {
  id: string;
  url: string;                         // S3 URL or base64
  timestamp: number;                   // When generated
  productIds: string[];                // Products used
  productNames: string[];              // Product names
  settings: SceneGenerationSettings;   // Settings snapshot
  debugPrompt?: string;                // Prompt used
}
```

## Routing

```
/[clientId]/scene-studio/[studioId]
```

### Examples:
```
/acme-corp/scene-studio/default
/acme-corp/scene-studio/summer-campaign-2024
/acme-corp/scene-studio/3a8f9c2d
```

## Persistence Flow

### 1. Initial Load
1. User navigates to `/[clientId]/scene-studio/[studioId]`
2. Page loads studio from `client.sceneStudios.find(s => s.id === studioId)`
3. If studio exists → loads `outputSlots` into state
4. If studio doesn't exist → creates new empty studio (handled by DataContext)

### 2. State Changes
When user makes changes (adds product, changes settings, generates image):
```typescript
// Local state updates immediately
setRows(prev => /* updated rows */);

// TODO: Persist to backend (debounced)
await updateSceneStudio(clientId, studioId, { outputSlots: rows });
```

### 3. Generation
When user clicks "Execute":
```typescript
// 1. Update status to GENERATING
setRows(prev => prev.map(r => r.id === rowId ? { ...r, status: SlotStatus.GENERATING } : r));

// 2. Call generation API
const { imageUrl, promptUsed } = await fetch(`/api/clients/${clientId}/scene-studio/${studioId}/generate`, {
  method: 'POST',
  body: JSON.stringify({ slotId: rowId, products, settings })
});

// 3. Create history item
const newHistoryItem: GeneratedSceneImage = {
  id: generateId(),
  url: imageUrl,
  timestamp: Date.now(),
  productIds: row.productIds,
  productNames: products.map(p => p.name),
  settings: { ...row.settings },
  debugPrompt: promptUsed
};

// 4. Update row with new image
setRows(prev => prev.map(r => r.id === rowId ? {
  ...r,
  status: SlotStatus.COMPLETED,
  outputImage: imageUrl,
  history: [newHistoryItem, ...r.history]
} : r));

// 5. Persist to backend
await updateSceneStudio(clientId, studioId, { outputSlots: rows });
```

## Storage

### S3 Structure
```
clients/
└── [clientId]/
    ├── client.json
    └── scene-studios/
        └── [studioId]/
            ├── config.json          (SceneStudio metadata)
            ├── slots/
            │   └── [slotId]/
            │       └── revisions/
            │           ├── [imageId].jpg
            │           ├── [imageId].jpg
            │           └── ...
            └── user-scenes/
                ├── [sceneId].jpg
                └── ...
```

### client.json (Updated)
```json
{
  "id": "acme-corp",
  "name": "ACME Corporation",
  "products": [...],
  "clientSessions": [...],
  "sceneStudios": [
    {
      "id": "default",
      "name": "Main Studio",
      "clientId": "acme-corp",
      "outputSlots": [
        {
          "id": "slot-1",
          "productIds": ["product-a", "product-b"],
          "status": "COMPLETED",
          "outputImage": "https://s3.../slot-1/revisions/img-3.jpg",
          "history": [
            {
              "id": "img-3",
              "url": "https://s3.../slot-1/revisions/img-3.jpg",
              "timestamp": 1704067200000,
              "productIds": ["product-a", "product-b"],
              "productNames": ["Oak Chair", "Ceramic Vase"],
              "settings": { /* full settings */ },
              "debugPrompt": "A modern living room..."
            },
            {
              "id": "img-2",
              "url": "https://s3.../slot-1/revisions/img-2.jpg",
              "timestamp": 1704063600000,
              "productIds": ["product-a", "product-b"],
              "productNames": ["Oak Chair", "Ceramic Vase"],
              "settings": { /* full settings */ }
            }
          ],
          "settings": {
            "scene": {
              "id": "stock-living-room-1",
              "name": "Modern Living Room",
              "imageUrl": "/scenes/living-room-modern.jpg"
            },
            "roomType": "Living Room",
            "style": "Modern",
            "lighting": "Natural Light",
            "cameraAngle": "Eye Level",
            "aspectRatio": "1:1",
            "varietyLevel": 7,
            "surroundings": "Moderate",
            "colorScheme": "Neutral Tones",
            "props": ["Plants", "Books"],
            "colorTheme": true,
            "accessories": false,
            "promptText": ""
          }
        }
      ],
      "userScenes": [],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

## DataContext Methods (To Implement)

```typescript
interface DataContextValue {
  // ... existing methods

  // Scene Studio CRUD
  addSceneStudio(clientId: string, name?: string): Promise<SceneStudio>;
  updateSceneStudio(clientId: string, studioId: string, updates: Partial<SceneStudio>): Promise<void>;
  deleteSceneStudio(clientId: string, studioId: string): Promise<void>;

  // Output Slot Operations
  addOutputSlot(clientId: string, studioId: string, productIds: string[]): Promise<OutputSlotConfig>;
  updateOutputSlot(clientId: string, studioId: string, slotId: string, updates: Partial<OutputSlotConfig>): Promise<void>;
  deleteOutputSlot(clientId: string, studioId: string, slotId: string): Promise<void>;

  // Generation
  generateSceneImage(clientId: string, studioId: string, slotId: string): Promise<GeneratedSceneImage>;

  // User Scenes
  addUserScene(clientId: string, studioId: string, scene: Scene): Promise<void>;
  deleteUserScene(clientId: string, studioId: string, sceneId: string): Promise<void>;
}
```

## Implementation Example

### 1. Auto-create Studio on First Visit

```typescript
// In scene-studio/[studioId]/page.tsx

useEffect(() => {
  if (!isLoading && !studio && studioId === 'default') {
    // Auto-create default studio if it doesn't exist
    addSceneStudio(clientId, 'Main Studio').then((newStudio) => {
      // Studio created, component will re-render with new data
    });
  }
}, [isLoading, studio, studioId, clientId]);
```

### 2. Save State on Changes (Debounced)

```typescript
import { useDebounce } from '@/lib/hooks/useDebounce';

// Debounce save to avoid excessive API calls
const debouncedRows = useDebounce(rows, 1000);

useEffect(() => {
  if (studio && debouncedRows.length > 0) {
    updateSceneStudio(clientId, studioId, {
      outputSlots: debouncedRows,
      updatedAt: new Date().toISOString()
    });
  }
}, [debouncedRows, clientId, studioId, studio]);
```

### 3. Handle Generation

```typescript
const handleGenerateRow = async (rowId: string) => {
  const row = rows.find(r => r.id === rowId);
  if (!row || row.productIds.length === 0) return;

  try {
    // Use DataContext method
    const newImage = await generateSceneImage(clientId, studioId, rowId);

    // Update local state
    setRows(prev => prev.map(r => r.id === rowId ? {
      ...r,
      status: SlotStatus.COMPLETED,
      outputImage: newImage.url,
      history: [newImage, ...r.history]
    } : r));

    // DataContext handles persistence
  } catch (err) {
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, status: SlotStatus.ERROR } : r
    ));
  }
};
```

## Migration Strategy

### Phase 1: Local State Only (Current)
- ✅ UI works with local state
- ❌ State lost on refresh

### Phase 2: Load from DataContext
- ✅ Load existing studio on mount
- ✅ Create default studio if missing
- ❌ No auto-save

### Phase 3: Save to DataContext
- ✅ Debounced auto-save on changes
- ✅ Save after generation
- ✅ Full persistence

### Phase 4: Optimistic Updates
- ✅ Instant UI updates
- ✅ Background sync to S3
- ✅ Conflict resolution

## Benefits of This Model

1. **Persistent Workspaces**: Studios act like saved sessions
2. **Full History**: Every revision is retained
3. **Configuration Snapshots**: Settings saved per revision
4. **Resumable**: Pick up exactly where you left off
5. **Shareable**: Studios can be shared via URL
6. **Multi-Studio**: Clients can have multiple studios for different campaigns

## Example User Flows

### Flow 1: First-Time User
1. User clicks "Open Scene Studio" in client settings
2. Navigates to `/acme-corp/scene-studio/default`
3. No studio exists → auto-creates "Main Studio"
4. User drags products, generates images
5. All state automatically persists
6. User closes browser
7. Returns later → all work is still there

### Flow 2: Campaign Management
1. User creates "Summer 2024" studio
2. Adds 5 products, configures as beachy/coastal theme
3. Generates 20 variations across 5 slots
4. Selects best 3 images
5. Creates "Fall 2024" studio
6. Different products, autumn theme
7. Both studios persist independently

### Flow 3: Revision History
1. User generates image with "Modern" style
2. Not satisfied → changes to "Industrial"
3. Generates again
4. Both versions retained in history
5. User can compare and choose best
6. Click revision thumbnail to swap
7. Download either version

## Next Steps

1. ✅ Update routing to `/[studioId]`
2. ✅ Load studio state on mount
3. ⬜ Implement DataContext methods
4. ⬜ Add auto-save with debounce
5. ⬜ Connect generation API
6. ⬜ Add UI for managing multiple studios
7. ⬜ Implement user scene uploads
