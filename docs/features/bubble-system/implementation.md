# Extensible Bubble System Implementation

## Vision

Create a bubble registry system where adding/removing bubble types is trivial. Each bubble type lives in its own folder with UI, prompt logic, and metadata. The system auto-discovers bubbles and wires them into the config panel, database, and Art Director.

## Implementation Status

### ✅ Phase 1: Type System & Registry Foundation (COMPLETED)

**Created Files:**

1. `/packages/visualizer-types/src/bubbles.ts` - New bubble value types with discriminated union
2. `/components/studio/bubbles/types.ts` - Bubble definition interface and modal props
3. `/components/studio/bubbles/registry.ts` - Central registry with helper functions
4. `/components/studio/bubbles/index.ts` - Clean export point

**Bubble Definitions (7 types):**

All bubble definitions follow the same structure:
- `{type}/types.ts` - Type exports
- `{type}/{Type}Modal.tsx` - Modal component
- `{type}/definition.tsx` - Registry definition

1. **Style Bubble** (`style/`)
   - Presets: Modern, Minimalist, Industrial, etc.
   - Custom value support
   - Prompt context: "{preset} style"

2. **Lighting Bubble** (`lighting/`)
   - Presets: Natural Daylight, Warm Evening, Studio Soft Light, etc.
   - Custom value support
   - Prompt context: "{preset} lighting"

3. **Camera Angle Bubble** (`camera-angle/`)
   - Presets: Eye Level, Bird's Eye View, Low Angle, etc.
   - Prompt context: "shot from {preset}"

4. **Mood Bubble** (`mood/`)
   - Presets: Calm & Peaceful, Energetic, Cozy, etc.
   - Prompt context: "{preset} mood and atmosphere"

5. **Inspiration Bubble** (`inspiration/`)
   - Supports multiple images
   - Uses InspirationStep wizard component
   - Prompt context: "inspired by reference image"

6. **Color Palette Bubble** (`color-palette/`)
   - Up to 6 hex colors
   - Visual color picker + text input
   - Prompt context: "color palette: {colors}"

7. **Custom Bubble** (`custom/`)
   - Supports multiple instances
   - Optional label + description
   - Prompt context: raw custom value

**Key Features:**

```typescript
// Auto-generates type union from registry
export type BubbleType = typeof BUBBLE_DEFINITIONS[number]['type'];

// Helper functions
getBubbleDefinition(type: string)
getAllBubbleDefinitions()
getBubblesByCategory(category)
canHaveMultipleBubbles(type)
isBubbleTypeRegistered(type)
```

### ✅ Phase 2: UI Refactor (COMPLETED)

**Updated Components:**

1. **InspirationBubble.tsx**
   - Now uses registry's `renderPreview()` and `isEmpty()` methods
   - No longer has hardcoded checks for specific bubble properties
   - Automatically handles all bubble types from registry

2. **BubbleModalRouter.tsx** (NEW)
   - Routes to correct modal based on bubble type
   - Uses registry to lookup modal component
   - Replaces old hardcoded switch statement

3. **SceneTypeAccordion.tsx**
   - Updated to use BubbleModalRouter
   - No changes to logic, just modal routing

4. **AddBubbleButton.tsx**
   - Auto-discovers available bubbles from registry
   - No longer has hardcoded BUBBLE_TYPE_OPTIONS array
   - Uses useMemo for performance

**Result:** Adding/removing bubbles only requires registry update!

---

## 🔄 Phase 3: Persistence (IN PROGRESS)

### Database Schema Updates Needed

**Current State:**
- `CollectionSession.settings` uses `FlowGenerationSettings`
- `GenerationFlow.settings` uses `FlowGenerationSettings`
- Legacy `InspirationBubbleValue` type still used everywhere

**Required Changes:**

1. **Update settings types** in `visualizer-types/src/settings.ts`:

```typescript
// NEW: Clean collection settings
export interface CollectionGenerationSettings {
  sceneTypeBubbles: Record<string, { bubbles: BubbleValue[] }>;
  userPrompt?: string;
  aspectRatio: ImageAspectRatio;
  imageQuality: ImageQuality;
  variantsPerProduct: number;
  videoSettings?: VideoGenerationSettings;
  imageModel?: string;
}

// NEW: Clean flow settings (matches API payload)
export interface FlowGenerationSettings {
  selectedSceneType: string;
  bubbles: BubbleValue[];
  userPrompt?: string;
  aspectRatio: ImageAspectRatio;
  imageQuality: ImageQuality;
  variantsPerProduct: number;
  videoSettings?: VideoGenerationSettings;
  imageModel?: string;
  postAdjustments?: PostAdjustments;
}
```

2. **Migration Script** (`visualizer-db/migrations/XXX_refactor_bubble_settings.sql`):

```sql
-- Convert old InspirationBubbleValue format to new BubbleValue format
-- Map inspirationImage -> image (for inspiration bubbles)
-- Map stylePreset/lightingPreset to preset/customValue
-- Remove legacy fields
```

3. **Update API routes** to accept new format:
   - `/api/art-director/route.ts`
   - `/api/generate-images/route.ts`
   - All collection/flow save endpoints

---

## 🔄 Phase 4: Art Director Integration (NOT STARTED)

### Prompt Extraction via Registry

**Current Approach:** Hardcoded extraction logic per bubble type

**New Approach:** Use registry's `extractPromptContext()` method

**Example Implementation:**

```typescript
// app/api/art-director/route.ts
function extractPromptContextFromBubbles(bubbles: BubbleValue[]): string[] {
  const allContext: string[] = [];

  for (const bubble of bubbles) {
    const definition = getBubbleDefinition(bubble.type);
    if (!definition) continue;

    // Auto-extract via registry - completely agnostic
    const extracted = definition.extractPromptContext(bubble as any);
    allContext.push(...extracted);
  }

  return allContext;
}

// Use in prompt building
const bubbleContext = extractPromptContextFromBubbles(body.bubbles);
const systemPrompt = `
STYLE GUIDANCE:
${bubbleContext.join('\n')}
`;
```

**Files to Update:**
- `/app/api/art-director/route.ts`
- Remove legacy prompt tag system
- Simplify prompt builder

---

## 🔄 Phase 5: Cleanup (NOT STARTED)

### Files to Remove

1. **Old bubble library:**
   - `/components/studio/config-panel/bubbles/bubble-library.ts`
   - `/components/studio/config-panel/bubbles/bubble-modals.tsx`
   - `/components/studio/config-panel/bubbles/index.ts` (replace with new exports)

2. **Legacy types:**
   - Remove `InspirationBubbleType` from settings.ts (mark deprecated)
   - Remove old `InspirationBubbleValue` interface (keep for migration period)

3. **Update documentation:**
   - Add "How to add a new bubble" guide
   - Update API documentation
   - Add migration guide for users

---

## 📊 Impact Assessment

### Before (Current):
- 9 bubble types hardcoded
- Bubble logic scattered across files
- Adding new bubble = touching 10+ files
- Prompt extraction manually coded per type

### After (Extensible):
- Registry-based bubbles
- Each bubble self-contained in folder
- Adding new bubble = 1 folder + 1 line in registry
- Prompt extraction automatic via `extractPromptContext()`

---

## 🎯 Adding a New Bubble Type (Example: "Material")

### 1. Create folder structure:

```
components/studio/bubbles/material/
  types.ts
  MaterialModal.tsx
  definition.tsx
```

### 2. Define value type (in visualizer-types/src/bubbles.ts):

```typescript
export interface MaterialBubbleValue extends BaseBubbleValue {
  type: 'material';
  materials?: string[]; // e.g., ["wood", "metal", "glass"]
}

// Add to union
export type BubbleValue =
  | ...
  | MaterialBubbleValue;
```

### 3. Create modal (material/MaterialModal.tsx):

```typescript
export function MaterialModal({ value, onSave, onClose }: BubbleModalProps<MaterialBubbleValue>) {
  // Modal implementation
}
```

### 4. Create definition (material/definition.tsx):

```typescript
export const materialBubble: BubbleDefinition<MaterialBubbleValue> = {
  type: 'material',
  label: 'Material',
  icon: Droplet,
  category: 'technical',
  allowMultiple: true,

  Modal: MaterialModal,
  renderPreview: (value) => <div>...</div>,
  extractPromptContext: (value) => value.materials ? [`materials: ${value.materials.join(', ')}`] : [],
  isEmpty: (value) => !value.materials || value.materials.length === 0,
  getDefaultValue: () => ({ type: 'material' }),
};
```

### 5. Register (registry.ts):

```typescript
import { materialBubble } from './material/definition';

const BUBBLE_DEFINITIONS = [
  // ... existing bubbles ...
  materialBubble,  // ADD THIS LINE
];
```

**That's it!** Material bubbles now:
- ✅ Appear in config panel
- ✅ Save to database
- ✅ Sent to Art Director
- ✅ Auto-extracted in prompts

---

## 🔄 Removing a Bubble Type

### Example: Remove "Mood" bubble

1. Delete folder: `components/studio/bubbles/mood/`
2. Remove from registry: Remove `moodBubble` from `BUBBLE_DEFINITIONS`
3. Remove from type union: Remove `MoodBubbleValue` from `BubbleValue`

**Done!** Mood bubbles removed from entire system.

---

## 📝 Next Steps (Remaining Work)

### Priority 1: Complete Phase 3 (Persistence)
- [ ] Update `FlowGenerationSettings` type to use new `BubbleValue[]`
- [ ] Create database migration script
- [ ] Update collection studio save/load logic
- [ ] Update product studio save/load logic
- [ ] Update API client types

### Priority 2: Complete Phase 4 (Art Director)
- [ ] Refactor Art Director API to use registry for extraction
- [ ] Remove legacy prompt tag system
- [ ] Update prompt builder to use bubble context

### Priority 3: Complete Phase 5 (Cleanup)
- [ ] Remove old bubble-library.ts and bubble-modals.tsx
- [ ] Remove legacy types (keep for migration period)
- [ ] Update documentation
- [ ] Add migration guide

### Priority 4: Testing
- [ ] Test adding new bubble type end-to-end
- [ ] Test removing bubble type
- [ ] Test backward compatibility with old data
- [ ] Update E2E tests to use new bubble system

---

## 🎉 Expected Outcome

### Data Flow:

```
User adds bubble in UI
  ↓
ConfigPanel uses registry to render
  ↓
Saves to DB: flow.settings.bubbles = [...]
  ↓
Load from DB → ConfigPanel initializes
  ↓
Generate: Send bubbles to Art Director
  ↓
Art Director uses registry to extract prompt context
  ↓
Claude generates enhanced prompt
```

### Example Generation Flow:

```typescript
// User configures in UI
selectedSceneType: "Living Room"
bubbles: [
  { type: 'style', preset: 'Modern Minimalist' },
  { type: 'lighting', preset: 'Natural Daylight' },
  { type: 'camera-angle', preset: 'Eye Level' },
  { type: 'custom', value: 'with plants' }
]

// Saved to DB
flow.settings = {
  selectedSceneType: "Living Room",
  bubbles: [...],
  userPrompt: "",
  aspectRatio: "16:9",
  imageQuality: "4k",
  variantsPerProduct: 3
}

// Sent to Art Director
POST /api/art-director {
  sceneType: "Living Room",
  bubbles: [...],
  productNames: ["Modern Sofa"]
}

// Art Director extracts via registry
extractPromptContext(bubbles) → [
  "Modern Minimalist style",
  "Natural Daylight lighting",
  "shot from eye level",
  "with plants"
]

// Final prompt
"Product: Modern Sofa

Scene description:
A modern minimalist living room bathed in soft natural daylight...
Shot at eye level for an intimate perspective...
with plants adding organic warmth...

Output: Ultra high resolution, photorealistic..."
```

---

## 🚀 Benefits

1. **Extensibility:** Add/remove bubbles in minutes
2. **Maintainability:** Each bubble is self-contained
3. **Type Safety:** Full TypeScript support with discriminated unions
4. **Auto-Discovery:** UI automatically shows all registered bubbles
5. **Prompt Flexibility:** Easy to customize prompt extraction per bubble
6. **Future-Proof:** Easy to add new features (e.g., bubble presets, sharing)

---

## 📚 Architecture Decisions

### Why a Registry Pattern?

- **Single Source of Truth:** All bubble definitions in one place
- **Auto-Discovery:** No need to manually wire up new bubbles
- **Compile-Time Safety:** TypeScript ensures type correctness
- **Runtime Flexibility:** Easy to extend without breaking changes

### Why Discriminated Unions?

- **Type Safety:** Each bubble type has its own interface
- **Exhaustive Checking:** TypeScript ensures all cases handled
- **Extensibility:** Easy to add new bubble types
- **Backward Compatibility:** Old bubble types can coexist during migration

### Why Individual Modals?

- **Code Splitting:** Each modal loaded only when needed
- **Customization:** Each bubble can have unique UX
- **Reusability:** Modal components can be reused elsewhere

---

## 🐛 Known Issues / TODOs

1. **Legacy compatibility:** Need to support old `InspirationBubbleValue` during migration
2. **Database migration:** Need to convert existing records to new format
3. **Type casting:** Some `as any` casts in renderPreview (acceptable for now)
4. **Vision analysis:** Inspiration bubbles should extract vision analysis context
5. **Bubble presets:** Consider adding preset configurations for common use cases

---

## 📖 Related Documentation

- Design Plan: `/BUBBLE_SYSTEM_REDESIGN.md` (original plan)
- Type Definitions: `/packages/visualizer-types/src/bubbles.ts`
- Registry Implementation: `/components/studio/bubbles/registry.ts`
- Example Bubble: `/components/studio/bubbles/style/` (reference implementation)
