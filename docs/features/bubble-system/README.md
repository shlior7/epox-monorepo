# Bubble System Documentation

> Extensible inspiration system for AI-powered product visualization

---

## Overview

The Bubble System is a registry-based architecture that allows easy addition and removal of inspiration "bubbles" - UI components that capture user preferences for AI generation.

**Status:** ✅ Production-ready

---

## Documents

### [Overview](./overview.md)
Complete feature description including:
- What bubbles are
- How they work
- Architecture decisions
- Implementation status

### [Implementation](./implementation.md)
Technical implementation details:
- Registry system
- Bubble definitions
- Type system
- Adding new bubbles

### [Complete Summary](./complete-summary.md)
Full implementation summary:
- All bubble types
- File structure
- Testing coverage
- Production readiness

---

## Quick Reference

### Available Bubble Types

1. **Style Bubble** - Visual style (modern, vintage, minimal, etc.)
2. **Lighting Bubble** - Lighting conditions (natural, studio, dramatic, etc.)
3. **Camera Angle Bubble** - Camera perspective (eye-level, overhead, close-up, etc.)
4. **Mood Bubble** - Emotional atmosphere (calm, energetic, luxurious, etc.)
5. **Inspiration Bubble** - Reference images
6. **Color Palette Bubble** - Color schemes
7. **Custom Bubble** - Free-form text input

### Adding a New Bubble

```typescript
// 1. Create definition file
// apps/epox-platform/components/studio/bubbles/my-bubble/definition.tsx

import { BubbleDefinition } from 'visualizer-types/bubbles';

export const MyBubbleDefinition: BubbleDefinition = {
  id: 'my-bubble',
  label: 'My Bubble',
  icon: MyIcon,
  component: MyBubbleForm,
  extractPrompt: (value) => {
    // Convert bubble value to prompt text
    return `with ${value}`;
  },
  validate: (value) => {
    // Optional validation
    return value?.length > 0;
  },
};

// 2. Register in registry
// apps/epox-platform/components/studio/bubbles/registry.ts

import { MyBubbleDefinition } from './my-bubble/definition';

BubbleRegistry.register(MyBubbleDefinition);
```

---

## Architecture

### Registry Pattern

```typescript
// Centralized registry
BubbleRegistry.register(definition);
BubbleRegistry.get('bubble-id');
BubbleRegistry.getAll();
BubbleRegistry.remove('bubble-id');
```

### Type System

```typescript
// Bubble definition
interface BubbleDefinition {
  id: string;
  label: string;
  icon: React.ComponentType;
  component: React.ComponentType<BubbleFormProps>;
  extractPrompt: (value: any) => string;
  validate?: (value: any) => boolean;
}

// Bubble value
interface BubbleValue {
  id: string;
  type: string;
  value: any;
}
```

---

## Usage Examples

### Display All Bubbles

```typescript
import { BubbleRegistry } from '@/components/studio/bubbles/registry';

function BubbleSelector() {
  const bubbles = BubbleRegistry.getAll();
  
  return (
    <div>
      {bubbles.map((def) => (
        <BubbleCard key={def.id} definition={def} />
      ))}
    </div>
  );
}
```

### Extract Prompt

```typescript
import { extractBubblePrompt } from 'visualizer-types/bubble-utils';

const bubbles = [
  { id: '1', type: 'style', value: 'modern' },
  { id: '2', type: 'lighting', value: 'natural' },
];

const prompt = extractBubblePrompt(bubbles);
// Output: "with modern style with natural lighting"
```

---

## Testing

### Unit Tests

```bash
# Test bubble registry
yarn test bubble-registry

# Test specific bubble
yarn test style-bubble
```

### E2E Tests

```bash
# Test bubble UI interactions
yarn test:e2e tests/bubbles/
```

---

## Related Documentation

- [Implementation Details](./implementation.md)
- [Type System](../../../packages/visualizer-types/src/bubbles.ts)
- [Optimistic Updates](../optimistic-updates.md)
- [Testing Guide](../../testing/README.md)

---

**Last Updated:** 2026-01-26
