# Development Notes

## React 19 Compatibility

This extension uses React 19, which has some changes from React 18:

### Changes Implemented
- ✅ Using `react-dom/client` for root creation
- ✅ No usage of legacy APIs
- ✅ Event handlers use proper types

### Potential Issues to Watch
1. **Shadow DOM + React 19**: Should work fine, but test thoroughly
2. **StrictMode**: Enabled, will cause double-rendering in dev mode
3. **Event handling**: Uses native DOM events (MouseEvent, KeyboardEvent)

## Shadow DOM Styling

Current approach uses `<link>` tag to load styles into shadow DOM:

```typescript
const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = chrome.runtime.getURL('src/content/styles.css');
shadowRoot.appendChild(styleLink);
```

### Alternative Approach (if link doesn't work)

Import styles as string and inject directly:

```typescript
import styles from './styles.css?inline';

const styleElement = document.createElement('style');
styleElement.textContent = styles;
shadowRoot.appendChild(styleElement);
```

Update vite.config.ts to support `?inline`:

```typescript
// In vite.config.ts
export default defineConfig({
  // ... existing config
  assetsInclude: ['**/*.css'],
});
```

## CRXJS Plugin Notes

The `@crxjs/vite-plugin` handles:
- Automatic manifest processing
- Hot module reload for extension development
- Asset bundling
- Multiple entry points (popup, sidepanel, content scripts)

### Watch for:
1. Output structure in `dist/` - CRXJS may reorganize files
2. Asset URLs - use `chrome.runtime.getURL()` for resources
3. Service worker compilation - must be ESM format

## Chrome Storage Limits

Current implementation uses `chrome.storage.local`:

- **Limit**: 10MB total
- **Per-item limit**: 8KB (for sync storage, local is larger)

### Optimization Strategies (if needed)
1. Compress JSON before storing
2. Paginate large annotation sets
3. Archive old pages to separate storage
4. Use IndexedDB for very large datasets (requires more complex code)

## URL Normalization Edge Cases

Current implementation:
```typescript
function normalizeUrl(url: string): string {
  const urlObj = new URL(url);
  return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, '')}${urlObj.hash}`;
}
```

### Considerations:
- Query params are stripped (by design)
- Hash is kept (for SPAs with hash routing)
- Trailing slash removed
- May need to handle:
  - `www.` vs non-www
  - `http://` vs `https://`
  - Port numbers

### Future Enhancement:
Add config option for URL matching strictness:
- Exact match
- Ignore query params (current)
- Ignore hash
- Fuzzy match (domain + path only)

## Positioning System

Two modes implemented:

### 1. Coordinate-based (current default)
```typescript
{
  type: 'coordinate',
  x: number,  // % from left
  y: number,  // % from top
  scrollY: number
}
```

**Pros**: Simple, always works
**Cons**: Breaks if page layout changes

### 2. Selector-based (partial implementation)
```typescript
{
  type: 'selector',
  selector: string,  // CSS selector
  offsetX: number,
  offsetY: number
}
```

**Pros**: Follows element if page changes
**Cons**: Fails if element removed or selector breaks

### Improvement Ideas:
1. Hybrid mode: Try selector first, fallback to coordinates
2. Smart selector: Include multiple fallback selectors
3. Element fingerprinting: Store element attributes for matching

## Keyboard Shortcuts

Currently implemented:
- `T` - Text tool
- `A` - Arrow tool
- `Esc` - Select tool / close dialogs

### Avoid Conflicts:
- Don't use Ctrl/Cmd shortcuts (browser reserved)
- Don't use F-keys (developer tools)
- Letter keys OK when extension active
- Check for input focus before handling keys

### Future Shortcuts:
- `C` - Comment tool
- `H` - Highlight tool
- `Delete` - Delete selected annotation
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+E` - Export

## Undo/Redo Implementation (Future)

Strategy:
```typescript
interface HistoryState {
  annotations: Annotation[];
  timestamp: string;
}

const history: HistoryState[] = [];
let historyIndex = 0;

function pushHistory(state: HistoryState) {
  history.splice(historyIndex + 1);
  history.push(state);
  historyIndex = history.length - 1;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    return history[historyIndex];
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    return history[historyIndex];
  }
}
```

## Text Highlight Implementation

Current approach in AnnotationOverlay:
```typescript
useEffect(() => {
  const handleSelection = () => {
    if (currentTool !== 'highlight') return;
    const selection = window.getSelection();
    // ... create highlight annotation
  };
  document.addEventListener('mouseup', handleSelection);
}, [currentTool]);
```

### Issue:
Highlights are stored as annotations, not actual DOM modifications.
Need to actually wrap selected text in a `<mark>` or `<span>` element.

### Better Implementation:
```typescript
function highlightSelection() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  const highlight = document.createElement('mark');
  highlight.className = 'anton-highlight';
  highlight.dataset.annotationId = annotationId;

  range.surroundContents(highlight);

  // Store range info for persistence
  const annotation = {
    // ... other fields
    rangeStart: getRangeStartPath(range),
    rangeEnd: getRangeEndPath(range),
  };
}
```

## Performance Optimizations

### Current Implementation
- React re-renders on every annotation change
- All markers rendered even if off-screen
- Scroll event listeners on every marker

### Potential Improvements
1. **Virtual rendering**: Only render visible annotations
2. **Debounce scroll handlers**: Limit position updates
3. **Memoization**: Use React.memo() for markers
4. **Batch updates**: Use single useEffect for all position updates

### Benchmark Targets
- < 16ms render time (60fps)
- < 100ms to load 1000 annotations
- < 50ms to add new annotation

## Testing Strategy

### Manual Testing Checklist
- [ ] Each annotation type works
- [ ] Persistence across reloads
- [ ] Side panel navigation
- [ ] Export/import
- [ ] Keyboard shortcuts
- [ ] Multiple pages
- [ ] Edge cases (empty state, max annotations, etc.)

### Automated Testing (Future)
- Unit tests: Storage, positioning, selector generation
- Integration tests: Annotation CRUD, export/import
- E2E tests: Full user flows with Playwright

## Security Considerations

### Current Implementation
- ✅ No eval() or unsafe innerHTML
- ✅ CSP-compliant
- ✅ No external scripts
- ✅ User input sanitized in prompts

### Potential Risks
1. **XSS via annotation content**: Mitigated by React's auto-escaping
2. **CSS injection**: Annotation content rendered as text only
3. **Storage tampering**: User can modify chrome.storage, but only affects their own data

### If Adding Backend (Phase 2)
- Validate all data server-side
- Use HTTPS only
- Implement auth tokens
- Rate limit API requests
- Sanitize all user content

## Known Limitations

1. **No multi-user sync**: Each user's annotations are local only
2. **No version control**: Can't see annotation history
3. **No search**: Must browse page list manually
4. **No filtering by author**: All annotations treated equally
5. **Limited positioning**: Coordinate-based breaks on responsive design changes
6. **No real thumbnails**: Screenshot API needs testing
7. **No animation**: Annotations appear instantly

## Future Feature Ideas

### Short Term
- Customizable colors per annotation type
- Annotation opacity slider
- Export to PDF with annotations
- Print view with annotations

### Medium Term
- Annotation templates
- Tagging system
- Search across all annotations
- Batch operations (delete all, resolve all, etc.)
- Keyboard shortcuts panel

### Long Term
- Real-time collaboration
- Video annotations (for YouTube, etc.)
- AI-powered annotation suggestions
- Integration with note-taking apps (Notion, Obsidian)
- Public annotation sharing (optional)

## Debugging Commands

Useful Chrome console commands:

```javascript
// View all stored annotations
chrome.storage.local.get('anton_url_annotations', console.log);

// Clear all data
chrome.storage.local.clear();

// Get current URL's annotations
chrome.storage.local.get('anton_url_annotations', (result) => {
  const url = window.location.href;
  console.log(result.anton_url_annotations?.[url]);
});

// Export raw data
chrome.storage.local.get(null, (data) => {
  console.log(JSON.stringify(data, null, 2));
});
```

## Build Output Structure

Expected `dist/` folder after build:

```
dist/
├── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── index.js
│   │   └── styles.css
│   ├── popup/
│   │   ├── index.html
│   │   └── index.js
│   └── sidepanel/
│       ├── index.html
│       └── index.js
└── assets/
    └── (bundled CSS/JS chunks)
```

Note: CRXJS may change this structure. Verify after first build.
