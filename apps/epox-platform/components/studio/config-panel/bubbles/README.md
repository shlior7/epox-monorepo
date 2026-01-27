# Inspiration Bubble System

A comprehensive, extensible system for managing inspiration bubbles in the configuration panel.

## Overview

The bubble system provides:
- Centralized bubble library with predefined types
- Clickable bubbles that open modals for editing
- Easy-to-add new bubble types
- Consistent UI/UX across all bubble types
- State management integration

## Architecture

```
bubbles/
├── bubble-library.ts    # Bubble definitions and registry
├── bubble-modals.tsx    # Modal components for each bubble type
├── index.ts            # Exports
└── README.md           # This file
```

## Adding a New Bubble Type

### Step 1: Add to Bubble Library

Edit `bubble-library.ts`:

```typescript
export const BUBBLE_LIBRARY: Record<InspirationBubbleType, BubbleDefinition> = {
  // ... existing bubbles

  'your-new-type': {
    type: 'your-new-type',
    label: 'Your Label',
    icon: YourIcon,  // Import from lucide-react
    description: 'What this bubble does',
    category: 'style', // 'style' | 'scene' | 'technical'
    requiresInput: true, // Does it need a modal?
    allowMultiple: false, // Can user add multiple of this type?
  },
};
```

### Step 2: Add Modal Component

Edit `bubble-modals.tsx`:

```typescript
export function YourNewTypeBubbleModal({ isOpen, onClose, bubbleValue, onSave }: BubbleModalProps) {
  const [value, setValue] = useState(bubbleValue.yourField || '');

  const handleSave = () => {
    onSave({
      type: 'your-new-type',
      yourField: value,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Label</DialogTitle>
        </DialogHeader>
        {/* Your UI here */}
        <Button onClick={handleSave}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 3: Add to Modal Router

In `bubble-modals.tsx`, update the `BubbleModal` component:

```typescript
export function BubbleModal({ type, isOpen, onClose, bubbleValue, onSave }: {...}) {
  switch (type) {
    // ... existing cases
    case 'your-new-type':
      return <YourNewTypeBubbleModal isOpen={isOpen} onClose={onClose} bubbleValue={bubbleValue} onSave={onSave} />;
    default:
      return null;
  }
}
```

### Step 4: Update visualizer-types (if needed)

If your new bubble type needs new fields, update the `InspirationBubbleValue` type:

```typescript
// In packages/visualizer-types/src/index.ts

export interface InspirationBubbleValue {
  type: InspirationBubbleType;
  // ... existing fields
  yourField?: string; // Add your new field
}

export type InspirationBubbleType =
  | 'style'
  | 'lighting'
  // ... existing types
  | 'your-new-type'; // Add your type
```

## Usage

Bubbles are automatically rendered in the config panel. When clicked, they open their respective modals.

### Default Bubbles

Three bubbles are automatically initialized for every scene type:
1. Style
2. Inspiration
3. Lighting

### User Interactions

- **Click bubble**: Opens modal to edit
- **Click + button**: Opens menu to add new bubble
- **Hover bubble**: Shows remove (X) button
- **Click X**: Removes bubble

## Bubble Categories

- **style**: Visual aesthetics (style, color-palette, mood)
- **scene**: Scene composition (inspiration, product)
- **technical**: Technical settings (lighting, camera-angle, material)

Categories determine the bubble's color scheme:
- style → purple
- scene → blue
- technical → amber

## Bubble State Management

Bubbles are stored in the `ConfigPanelContext` under `sceneTypeBubbles`:

```typescript
{
  "Living Room": {
    bubbles: [
      { type: 'style', stylePreset: 'Modern' },
      { type: 'lighting', lightingPreset: 'Natural Daylight' },
      { type: 'inspiration', inspirationImage: {...} }
    ]
  }
}
```

## Best Practices

1. **Keep modals simple**: Focus on the essential inputs
2. **Use presets**: Provide common options as clickable presets
3. **Add custom option**: Allow users to enter custom values
4. **Validate input**: Ensure values are valid before saving
5. **Update types**: Always keep TypeScript types in sync

## Examples

### Simple Bubble (Preset-Based)

```typescript
// Mood bubble - select from presets
{
  type: 'mood',
  label: 'Mood',
  icon: Heart,
  category: 'style',
  requiresInput: true,
  allowMultiple: false,
}
```

### Complex Bubble (Custom Input)

```typescript
// Custom bubble - freeform text
{
  type: 'custom',
  label: 'Custom',
  icon: Eye,
  category: 'scene',
  requiresInput: true,
  allowMultiple: true,  // Can have multiple custom bubbles
}
```

### Image Bubble

```typescript
// Inspiration bubble - upload/link image
{
  type: 'inspiration',
  label: 'Inspiration',
  icon: Lightbulb,
  category: 'scene',
  requiresInput: true,
  allowMultiple: true,  // Can have multiple inspiration images
}
```

## Future Enhancements

- Drag-and-drop bubble reordering
- Bubble templates/presets
- Bubble categories in add menu
- Bubble search/filter
- Bubble validation rules
- Bubble tooltips with descriptions
