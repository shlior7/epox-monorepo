# Scene Studio Updates - Navigation & Scene Management

## Changes Made

### ✅ Client Settings Page Updates

**File:** `/app/[clientId]/settings/page.tsx`

#### 1. Added "Create Scene" Action

- New `handleCreateScene()` function that generates a unique scene ID
- Creates scene with ID format: `scene-{timestamp}`
- Navigates to new scene immediately
- Disabled state while creating

#### 2. Replaced Scene Studio Button with Scenes Accordion

**Old:** Single "Open Scene Studio" button that navigated to default studio

**New:** Full "Scenes" accordion section with:

- **Header**: Shows count of scenes `Scenes (X)`
- **Action Menu**: "Create Scene" button in header
- **Scene List**: All client scene studios displayed as cards
  - Scene icon (Layers)
  - Scene name
  - Slot count and creation date
  - Click to navigate to scene
  - Actions menu per scene:
    - "Open Scene"
    - "Delete" (with confirmation dialog)

**Empty State**:

- Message: "No scenes yet. Create your first scene to get started."

---

### ✅ Scene Studio Page Updates

**File:** `/app/[clientId]/scene-studio/[studioId]/page.tsx`

#### 1. Left Panel Redesigned

**Old:** Product catalog with draggable product cards

**New:** Scene navigation list

- **Header**: "Scenes" instead of "Catalog"
- **Content**: List of all client scenes
  - Each scene shows:
    - Layers icon in thumbnail area
    - Scene name
    - Slot count
    - Active indicator (pulsing dot) for current scene
  - **Active scene**: Highlighted with indigo border and background
  - **Click behavior**: Navigate to that scene
  - **Empty state**: "No Scenes" with hint to create in client settings

#### 2. Products Now Managed in Client Settings

- Removed product drag-and-drop from workspace
- Products visible and manageable in Products accordion on client settings page
- Products added to slots through:
  - Direct selection (TODO: Add product picker in properties panel)
  - Or DataContext methods (future implementation)

---

### ✅ Styling Updates

**File:** `/app/[clientId]/scene-studio/[studioId]/page.module.scss`

#### Added Styles:

- `.productCardActive` - Active scene highlighting
- `.sceneIconLarge` - Larger icon for scene thumbnails
- `.productMeta` - Smaller metadata text under scene name
- `.activeIndicator` - Container for active dot
- `.activeDot` - Pulsing indicator animation
- `.emptyStateHint` - Subtle hint text in empty state
- Updated `.productCard` cursor from `grab` to `pointer`
- Added flex centering to `.productThumbnail` for icon display

---

## New User Flow

### 1. Creating & Managing Scenes

#### From Client Settings:

1. Navigate to client settings page
2. Scroll to "Scenes" accordion
3. Click action menu → "Create Scene"
4. New scene created with unique ID
5. Automatically navigate to new scene studio
6. Scene appears in scenes list (both settings and studio)

#### Deleting Scenes:

1. In client settings, find scene in list
2. Click scene actions menu → "Delete"
3. Confirmation dialog appears
4. Confirm deletion (TODO: Implement actual deletion in DataContext)

### 2. Navigating Between Scenes

#### From Client Settings:

1. Click any scene card in the Scenes accordion
2. Navigate to that scene's studio

#### From Scene Studio:

1. Left panel shows all scenes
2. Current scene highlighted with indigo border and pulsing dot
3. Click any other scene to switch
4. Page reloads with new scene's data

### 3. Working with Products

#### View Products:

1. Go to client settings
2. Products accordion shows all products
3. View product images, metadata, favorites

#### Add Products to Scene (Current):

- Products must be added programmatically (via DataContext methods)
- TODO: Add product picker UI in properties panel or workspace

#### Add Products to Scene (Future):

- Product picker modal in workspace
- Drag-and-drop from dedicated product selector
- Multi-select from client's product library

---

## Data Flow

### Scene Creation

```typescript
// Client Settings
handleCreateScene()
  → Generate ID: `scene-${Date.now()}`
  → Navigate to: `/${clientId}/scene-studio/${newSceneId}`
  → TODO: Call addSceneStudio(clientId, sceneName)
```

### Scene Navigation

```typescript
// From Scene List
onClick scene card
  → window.location.href = `/${clientId}/scene-studio/${scene.id}`
  → Page loads
  → Finds studio: client.sceneStudios.find(s => s.id === studioId)
  → Loads outputSlots into state
```

### Scene Display

```typescript
// Left Panel
allScenes = client.sceneStudios || []
currentScene = scenes.find(s => s.id === studioId)
activeIndicator shown when: scene.id === studioId
```

---

## Architecture Benefits

### ✅ Clear Separation of Concerns

- **Client Settings**: Manage clients, products, scenes (meta-level)
- **Scene Studio**: Work within a specific scene (execution-level)

### ✅ Scene-Centric Workflow

- Each scene is a complete workspace
- Scenes retain all state (slots, products, revisions)
- Easy to switch between campaigns/projects

### ✅ Products as Resources

- Products live at client level
- Can be used across multiple scenes
- Managed centrally in one place

### ✅ Intuitive Navigation

- Left panel always shows "where am I?" context
- Click to navigate between scenes
- Active scene clearly indicated

---

## TODO: Next Steps

### 1. Implement Product Selection in Studio

**Options:**

- **A. Product Picker Modal**: Button in workspace opens modal with product list
- **B. Properties Panel**: Dropdown to select products for selected slots
- **C. Separate Tab**: Toggle between "Scenes" and "Products" in left panel
- **D. Inline Search**: Search/filter products in workspace header

**Recommended: Option A (Product Picker Modal)**

```typescript
// Add button in workspace header
<button onClick={() => setShowProductPicker(true)}>
  Add Products to Slot
</button>

// Modal shows all client products
// Multi-select products
// Click "Add to Slot" → updates selected slot's productIds
```

### 2. DataContext Integration

```typescript
// Implement scene CRUD
addSceneStudio(clientId: string, name: string): Promise<SceneStudio>
deleteSceneStudio(clientId: string, studioId: string): Promise<void>
updateSceneStudio(clientId: string, studioId: string, updates): Promise<void>

// Auto-create default scene on first visit
if (!client.sceneStudios || client.sceneStudios.length === 0) {
  await addSceneStudio(clientId, 'Main Studio');
}
```

### 3. Scene Naming

Currently scenes created with timestamp IDs. Add:

- Name input in creation flow
- Rename capability in scene list
- Default names: "Scene 1", "Scene 2", etc.

### 4. Scene Templates

- Save scene configuration as template
- Apply template to new scene
- Share templates across clients

---

## Migration Guide

### For Users Coming from Previous Version

**Before:**

- Click "Open Scene Studio" → Goes to single workspace
- Products in left panel
- One implicit scene per client

**After:**

- Click "Create Scene" → Creates new named scene
- Scenes in left panel (navigate between them)
- Products managed in client settings
- Multiple scenes per client

**Workflow Change:**

1. **Old**: Open studio → See products → Drag products → Generate
2. **New**: Create scene → Open scene → Add products (via picker) → Generate

---

## File Summary

### Modified Files:

1. `/app/[clientId]/settings/page.tsx`
   - Added `handleCreateScene()`
   - Added Scenes accordion section
   - Removed Scene Studio button section

2. `/app/[clientId]/scene-studio/[studioId]/page.tsx`
   - Updated left panel to show scenes
   - Removed product catalog
   - Added scene navigation logic
   - Added active scene highlighting

3. `/app/[clientId]/scene-studio/[studioId]/page.module.scss`
   - Added scene-specific styles
   - Updated product card for scenes
   - Added active state styles
   - Added pulsing indicator animation

### New Behavior:

- ✅ Scenes list in client settings
- ✅ Create scene action
- ✅ Scene navigation in studio
- ✅ Active scene indicator
- ✅ Scene-based routing
- ⬜ Product selection UI (TODO)
- ⬜ Scene persistence (TODO)
- ⬜ Scene deletion (TODO)

---

## Visual Changes

### Client Settings Page

```
┌─────────────────────────────────────┐
│  Client Name: [Input] [Save]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Products (5)              [Actions]│
│  • Product 1                        │
│  • Product 2                        │
│  • ...                              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Scenes (3)       [Create Scene]   │
│  🗂️ Summer Campaign   (5 slots)    │
│  🗂️ Fall Collection   (3 slots)    │
│  🗂️ Main Studio      (10 slots)    │
└─────────────────────────────────────┘
```

### Scene Studio Page

```
┌─────────┬───────────────────────┬─────────┐
│ SCENES  │      WORKSPACE        │  PROPS  │
├─────────┼───────────────────────┼─────────┤
│ 🗂️ Scene│                       │         │
│   1     │   [Output Slots]      │ Config  │
│         │                       │ Panel   │
│ 🗂️ Scene│   [Drag Products Here]│         │
│   2 ●   │                       │         │
│ (Active)│   [Generate]          │         │
│         │                       │         │
│ 🗂️ Scene│                       │         │
│   3     │                       │         │
└─────────┴───────────────────────┴─────────┘
● = Pulsing active indicator
```

---

This update transforms Scene Studio from a single workspace to a **multi-scene project management system**, aligning with your vision of scenes as persistent sessions that retain all their state and configuration.
