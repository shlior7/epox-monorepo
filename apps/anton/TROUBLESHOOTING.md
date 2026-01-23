# Anton - Troubleshooting Guide

## Build Issues

### "Cannot find module @crxjs/vite-plugin"

**Cause**: Dependencies not installed.

**Fix**:
```bash
cd apps/anton
yarn install
```

### "Module not found: Can't resolve 'react'"

**Cause**: React dependencies missing or version mismatch.

**Fix**:
```bash
# From monorepo root
yarn install
```

Make sure React 19 is installed (check package.json resolutions in root).

### Build succeeds but no dist/ folder

**Cause**: Vite output directory issue.

**Fix**:
```bash
# Clean and rebuild
rm -rf dist node_modules
yarn install
yarn build
```

## Extension Loading Issues

### "Failed to load extension"

**Cause**: Manifest.json errors or missing files.

**Fix**:
1. Check Chrome DevTools console for specific error
2. Verify dist/ folder contains:
   - manifest.json
   - src/ directory with all bundles
3. Rebuild: `yarn build`

### Extension loads but doesn't activate

**Cause**: Content script not injecting.

**Fix**:
1. Check extension permissions in `chrome://extensions`
2. Ensure "Allow access to file URLs" is enabled if testing locally
3. Refresh the page after enabling extension
4. Check browser console for errors

### Toolbar doesn't appear

**Cause**: Extension not toggled on.

**Fix**:
1. Click the Anton icon in Chrome toolbar
2. Or use the popup: "Toggle Annotations" button
3. Check content script console: `console.log('Anton content script loaded')`

## Runtime Issues

### Annotations don't persist

**Cause**: Storage not working or URL normalization issue.

**Fix**:
1. Check Chrome DevTools → Application → Storage → Local Storage
2. Look for `anton_url_annotations` key
3. Verify permissions in manifest.json include `"storage"`

### Annotations appear in wrong position

**Cause**: Position calculation error or scroll offset issue.

**Fix**:
- Refresh page
- Clear annotations and recreate
- Check browser console for JavaScript errors

### Arrow drawing doesn't work

**Cause**: Mouse event listeners not attached.

**Fix**:
1. Make sure Arrow tool is selected (should be highlighted)
2. Press 'A' key to activate
3. Click and drag (don't just click)
4. Release mouse to complete arrow

### Comment thread doesn't open

**Cause**: Click event not propagating.

**Fix**:
1. Click directly on the numbered pin
2. Make sure you're in Select mode (not another tool)
3. Check console for errors

### Side panel is blank

**Cause**: React app not mounting or build issue.

**Fix**:
1. Check side panel console for errors
2. Verify `dist/src/sidepanel/index.html` exists
3. Rebuild extension

## Development Issues

### Hot reload not working

**Cause**: Vite watch mode not configured for Chrome extension.

**Fix**:
```bash
# Run dev mode
yarn dev

# After changes, manually reload extension:
# chrome://extensions → click refresh icon
```

### TypeScript errors

**Cause**: Missing type definitions or version mismatch.

**Fix**:
```bash
yarn add -D @types/chrome @types/react @types/react-dom
```

### Tailwind styles not applied

**Cause**: CSS not injected into shadow DOM.

**Fix**:
1. Verify `styles.css` is imported in content script
2. Check shadow DOM in DevTools Elements panel
3. Ensure PostCSS is processing Tailwind directives

## Chrome Extension Specific Issues

### "Service worker registration failed"

**Cause**: Background script syntax error.

**Fix**:
1. Check `src/background/service-worker.ts` for errors
2. Rebuild and reload extension
3. Check background service worker console in `chrome://extensions`

### Permissions errors

**Cause**: Manifest permissions insufficient.

**Fix**:
Verify manifest.json has:
```json
{
  "permissions": ["storage", "activeTab", "sidePanel", "tabs"],
  "host_permissions": ["<all_urls>"]
}
```

### CSP (Content Security Policy) violations

**Cause**: Inline scripts or unsafe eval.

**Fix**:
- Don't use inline event handlers
- Use `addEventListener` instead of `onclick`
- Avoid `eval()` and `new Function()`

## Data Issues

### Export produces empty JSON

**Cause**: No project created or storage empty.

**Fix**:
1. Add at least one annotation
2. Check storage: DevTools → Application → Storage
3. Verify URL is being normalized correctly

### Import doesn't merge annotations

**Cause**: URL normalization mismatch.

**Fix**:
The importer merges by URL. If URLs don't match exactly (after normalization), they're treated as separate pages.

Check URL normalization logic in `src/shared/storage.ts`.

## Performance Issues

### Page loads slowly with extension enabled

**Cause**: Too many annotations or inefficient rendering.

**Fix**:
1. Toggle visibility off when not needed
2. Limit annotations per page
3. Use coordinate-based positioning (more efficient than selector-based)

### Side panel lags when switching pages

**Cause**: Re-rendering all page thumbnails.

**Fix**:
- Thumbnails are currently placeholders
- Future: Implement virtual scrolling for long lists

## Common Error Messages

### "chrome is not defined"

**Cause**: Running code outside extension context.

**Fix**:
- Only use `chrome.*` APIs in extension scripts (not on web pages)
- Check you're loading the correct bundle

### "Cannot read property 'getAnnotationsForUrl'"

**Cause**: Storage module not imported.

**Fix**:
```typescript
import { getAnnotationsForUrl } from '@/shared/storage';
```

### "Shadow root is null"

**Cause**: Shadow DOM not created before rendering.

**Fix**:
Check content script index.tsx - shadow root creation must happen before React mount.

## Debugging Tips

### Enable verbose logging

Add to content script:
```typescript
console.log('[Anton] Overlay mounted');
console.log('[Anton] Tool changed:', currentTool);
console.log('[Anton] Annotations:', annotations);
```

### Inspect shadow DOM

1. Open DevTools
2. Elements tab
3. Find `#anton-root`
4. Expand shadow root
5. Inspect React components

### Monitor storage changes

```typescript
chrome.storage.onChanged.addListener((changes) => {
  console.log('Storage changed:', changes);
});
```

### Check background script logs

1. Go to `chrome://extensions`
2. Find Anton extension
3. Click "service worker" link
4. Opens dedicated console for background script

## Still Having Issues?

1. Check browser console (F12)
2. Check extension service worker console
3. Verify all files in `dist/` folder
4. Try uninstalling and reinstalling extension
5. Clear Chrome storage: `chrome.storage.local.clear()`
6. Check manifest.json syntax with JSON validator
7. Test in Incognito mode (enable extension for Incognito)

## Reporting Bugs

When reporting issues, include:
- Chrome version
- Extension version
- Steps to reproduce
- Console errors (browser + service worker)
- Screenshots if UI-related
- Export of storage data (if data-related)
