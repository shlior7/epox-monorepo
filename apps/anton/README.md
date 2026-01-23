# Anton - Website Annotation Tool

A Chrome extension for annotating live websites with comments, text labels, highlights, and arrows.

## Features

- **Comment Pins** - Click anywhere to add numbered comment markers with threads
- **Text Labels** - Press `T` and click to add floating text annotations
- **Highlights** - Select text and click the highlight tool to mark important content
- **Arrows** - Press `A` and drag to draw directional arrows
- **Auto-save** - Annotations automatically persist per URL
- **Side Panel** - Browse all annotated pages with thumbnails
- **Export/Import** - Share annotations via JSON files

## Development

### Install Dependencies

```bash
cd apps/anton
yarn install
```

### Build

```bash
yarn build
```

This creates a `dist/` folder with the compiled extension.

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `apps/anton/dist` folder

### Development Mode (Watch)

```bash
yarn dev
```

This will watch for changes and rebuild automatically. You'll need to click the refresh icon in `chrome://extensions` to reload the extension after changes.

## Usage

### Basic Workflow

1. Click the Anton extension icon in Chrome toolbar (or use the popup)
2. The floating toolbar appears at the top of the page
3. Select a tool and click/interact with the page:
   - **Select** (↖) - Default mode, click comment pins to open threads
   - **Comment** (💬) - Click to add a comment
   - **Text** (T) - Click to add a text label (or press `T`)
   - **Highlight** (✓) - Select text then click to highlight
   - **Arrow** (→) - Drag to draw an arrow (or press `A`)
4. Your annotations are automatically saved
5. Click the ☰ icon to open the side panel and see all annotated pages

### Keyboard Shortcuts

- `T` - Switch to Text tool
- `A` - Switch to Arrow tool
- `Esc` - Switch to Select tool / close comment thread

### Side Panel

- **Pages Tab** - View all annotated pages with:
  - Thumbnails (when available)
  - Annotation counts
  - Filter by: All, Has Comments, Unresolved
- **Import/Export Tab**
  - Export project as JSON file
  - Import annotations from JSON

### Sharing Annotations

1. Open side panel → Import/Export tab
2. Click "Export as JSON"
3. Share the downloaded file with others
4. They can import it via the Import/Export tab

## Architecture

```
apps/anton/
├── src/
│   ├── background/       # Service worker for extension lifecycle
│   ├── content/          # Injected overlay with annotation UI
│   ├── sidepanel/        # Side panel for browsing pages
│   ├── popup/            # Extension popup for quick toggle
│   ├── shared/           # Shared types, storage, messaging
│   └── lib/              # Utilities (selectors, positioning, screenshots)
├── manifest.json         # Chrome extension configuration
└── vite.config.ts        # Build configuration
```

### Tech Stack

- **React** - UI components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management (planned)
- **Vite + CRXJS** - Build tooling for Chrome extensions

## Data Storage

All annotations are stored locally in Chrome's `chrome.storage.local` API. No backend required.

### Storage Structure

```typescript
// URL-based storage
{
  "anton_url_annotations": {
    "https://example.com/page": {
      "annotations": [...],
      "lastVisited": "2024-01-01T00:00:00Z",
      "title": "Page Title"
    }
  }
}
```

### URL Normalization

URLs are normalized by:
- Removing trailing slashes
- Keeping path and hash
- Stripping query params (configurable)

This ensures annotations persist across similar URLs.

## Future Enhancements

- [ ] Real-time collaboration (WebSocket sync)
- [ ] User authentication
- [ ] Workspace sharing
- [ ] Screenshot annotations
- [ ] More annotation types (shapes, freehand drawing)
- [ ] Annotation search
- [ ] Keyboard navigation
- [ ] Undo/redo stack
- [ ] Customizable colors and themes

## License

MIT
