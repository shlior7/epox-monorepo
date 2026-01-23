# Anton - Quick Start Guide

## Installation (5 minutes)

### 1. Install Dependencies
```bash
cd apps/anton
yarn install
```

### 2. Build Extension
```bash
yarn build
```

This creates a `dist/` folder with the compiled extension.

### 3. Load in Chrome
1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Navigate to `apps/anton/dist` and select it
6. Extension icon appears in toolbar ✅

## First Annotation (30 seconds)

1. **Visit any website** (e.g., github.com)
2. **Click Anton icon** in Chrome toolbar
3. **Toolbar appears** at top of page
4. **Click Comment button** (💬)
5. **Click anywhere** on page
6. **Type your comment** in the prompt
7. **See numbered pin** appear! 🎉

## Try All Tools (2 minutes)

### Comment (💬)
1. Select Comment tool
2. Click anywhere
3. Enter text in prompt
4. Click the pin to open thread
5. Add replies, mark resolved

### Text Label (T)
1. Press `T` key or click Text tool
2. Click where you want the label
3. Double-click label to edit
4. Type and press Enter

### Highlight (✓)
1. Select Highlight tool
2. Select any text on the page
3. Text gets highlighted in yellow

### Arrow (→)
1. Press `A` key or click Arrow tool
2. Click and drag to draw arrow
3. Release to finish
4. Arrow appears with red color

## Navigation (30 seconds)

1. **Click ☰ button** in toolbar → Side panel opens
2. **See current page** in list with annotation count
3. **Navigate to another page** and add annotations
4. **Return to side panel** → see both pages listed
5. **Click a page** → navigate to it instantly

## Export & Share (1 minute)

1. Open side panel (☰ button)
2. Click "Import/Export" tab
3. Click "Export as JSON"
4. File downloads + copied to clipboard
5. Share file with others
6. They can import via "Import" button

## Keyboard Shortcuts

| Key   | Action           |
|-------|------------------|
| `T`   | Text tool        |
| `A`   | Arrow tool       |
| `Esc` | Select tool      |
| `Esc` | Close comment    |

## Tips & Tricks

### Faster Workflow
- Use keyboard shortcuts instead of clicking tools
- Press `Esc` to quickly return to Select mode
- Keep side panel open in a separate window

### Organization
- Use filters in side panel: All, Has Comments, Unresolved
- Mark comments as resolved when addressed
- Add replies to comments for discussions

### Persistence
- Annotations auto-save instantly
- Revisit any URL → annotations reappear
- No manual save needed

### Collaboration (via Export)
1. Make annotations
2. Export JSON
3. Share file (email, Slack, etc.)
4. Teammate imports JSON
5. They see your annotations

## Common Tasks

### Delete an Annotation
1. Select tool (Esc or ↖ button)
2. Click annotation marker
3. Click "Delete" in popup

### Edit Text Label
1. Double-click the label
2. Edit text
3. Click outside or press Enter

### Reply to Comment
1. Click comment pin
2. Type in reply box
3. Press Enter or click "Reply"

### Resolve Comment
1. Click comment pin
2. Click "Resolve" button
3. See ✓ indicator

### Hide All Annotations
1. Click eye icon (👁) in toolbar
2. Click again to show

### Clear All Annotations (for current page)
No built-in button yet. Workaround:
1. Open DevTools (F12)
2. Console tab
3. Run: `chrome.storage.local.clear()`
4. Refresh page

## Troubleshooting

### Extension won't activate
- Click the Anton icon in toolbar
- Check that extension is enabled in chrome://extensions

### Toolbar doesn't appear
- Click Anton icon again
- Refresh page
- Check browser console for errors

### Annotations disappeared
- Make sure you're on the exact same URL
- Check side panel → Pages tab
- Try export to verify data exists

### Side panel is blank
- Reload extension in chrome://extensions
- Check side panel console for errors

### Build failed
- Delete node_modules and yarn.lock
- Run `yarn install` again
- Make sure you're in apps/anton directory

## Next Steps

### Explore Features
- Try all annotation types
- Navigate between pages
- Export and re-import
- Test persistence

### Customize
- Edit colors in tailwind.config.js
- Adjust toolbar position in styles.css
- Change keyboard shortcuts in AnnotationOverlay.tsx

### Share Feedback
- Found a bug? Report it
- Want a feature? Suggest it
- Like it? Star the repo

## Development Mode

### Watch for changes
```bash
yarn dev
```

### After code changes
1. Edit source files
2. Wait for rebuild
3. Go to chrome://extensions
4. Click refresh icon on Anton extension
5. Reload page you're testing

### View logs
- **Content script**: Browser console (F12)
- **Background script**: chrome://extensions → "service worker"
- **Side panel**: Open side panel → F12 in side panel window
- **Popup**: Right-click Anton icon → Inspect popup

## Resources

- `README.md` - Full documentation
- `IMPLEMENTATION.md` - Technical details
- `TROUBLESHOOTING.md` - Common issues
- `NOTES.md` - Development notes

## Need Help?

1. Check TROUBLESHOOTING.md
2. Search existing issues
3. Ask in community/Slack/Discord
4. Create detailed bug report

---

**You're ready to annotate! 🎨**

Visit any website and start adding comments, labels, highlights, and arrows.
