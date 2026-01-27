# Design Documentation

> Design principles, plans, and UI specifications

---

## Overview

Design documentation including:
- Design principles
- Original design plans
- UI visual guides
- Implementation summaries

---

## Documents

### [Implementation Summary](./implementation-summary.md)
High-level implementation summary:
- What was built
- Key decisions
- Architecture choices

### [UI Visual Guide](./ui-visual-slideshow.md)
Visual design guide:
- Screen designs
- Component library
- Design system
- Color palette
- Typography

### [Design Plans](../plans/README.md)
Original design logs (001-013):
- Architecture & infrastructure
- Authentication & authorization
- Data model & terminology
- User flows & journey
- Screens & UI components
- Use cases & scenarios
- API design
- Business model & pricing

---

## Design Principles

### 1. Reuse Existing Infrastructure

- Use existing tables (StudioSession, Flow, GeneratedImage)
- Build on proven patterns from scenergy-visualizer
- Only add what's necessary (authentication tables)

### 2. Progressive Disclosure

- Show simple defaults first
- Hide advanced settings
- Guide users through workflows
- AI fills sensible values

### 3. Bulk-First UX

- Designed for 100+ products
- Multi-select and batch operations
- Studio session workflow
- Efficient bulk actions

### 4. Non-Technical Language

- "Warm lighting" not "temperature: 5500K"
- "Modern style" not "embedding vector"
- "Scene inspiration" not "conditioning image"
- User-friendly terminology

### 5. Resilient by Default

- Auto-save drafts
- Soft-delete with recovery
- Retry logic for failures
- Graceful fallbacks
- Clear error messages

### 6. Performance

- Virtual scrolling for large lists
- Optimistic UI updates
- Skeleton loaders
- Background processing
- Efficient polling

---

## Design System

### Colors

**Primary:**
- Blue: `#3B82F6` (brand color)
- Dark: `#1E293B` (text)
- Gray: `#64748B` (secondary text)

**Status:**
- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Info: `#3B82F6`

### Typography

**Font Family:**
- Sans: `Inter, system-ui, sans-serif`
- Mono: `Fira Code, monospace`

**Scale:**
- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px
- 3xl: 30px
- 4xl: 36px

### Spacing

**Scale:** 4px base unit
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 6: 24px
- 8: 32px
- 12: 48px
- 16: 64px

---

## Component Guidelines

### Buttons

```tsx
// Primary action
<Button variant="primary">Generate</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>
```

### Forms

```tsx
// Form field
<FormField
  label="Product Name"
  error={errors.name}
  required
>
  <Input {...register('name')} />
</FormField>
```

### Loading States

```tsx
// Skeleton loader
<Skeleton className="h-8 w-full" />

// Loading spinner
<Spinner size="md" />

// Progress bar
<Progress value={75} />
```

---

## Accessibility

### Standards

- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast (4.5:1 minimum)

### Best Practices

- Use semantic HTML
- Add ARIA labels where needed
- Provide focus indicators
- Support keyboard shortcuts
- Test with screen readers

---

## Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile-First

- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly targets (44x44px minimum)
- Simplified navigation on mobile

---

## Related Documentation

- [UI Visual Guide](./ui-visual-slideshow.md)
- [Design Plans](../plans/README.md)
- [Features](../features/README.md)
- [Frontend Development](../development/frontend-development.md)

---

**Last Updated:** 2026-01-26
