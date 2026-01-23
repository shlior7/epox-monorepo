# 🎨 Anton - Start Here

Welcome to Anton, your website annotation tool! This guide will get you up and running in 5 minutes.

## 📋 Quick Overview

Anton is a Chrome extension that lets you annotate any website with:
- 💬 **Comments** - Add threaded discussions anywhere
- 📝 **Text Labels** - Place floating notes
- ✨ **Highlights** - Mark important text
- ➡️ **Arrows** - Draw directional pointers

All annotations auto-save and persist when you revisit pages.

## 🚀 Installation (3 Steps)

### Step 1: Install Dependencies
```bash
cd apps/anton
yarn install
```

### Step 2: Build Extension
```bash
yarn build
```

### Step 3: Load in Chrome
1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select `apps/anton/dist` folder

**Done!** Anton icon appears in your toolbar.

## 🎯 First Use (30 Seconds)

1. Visit any website (try github.com)
2. Click the Anton icon in toolbar
3. Floating toolbar appears
4. Click the Comment button (💬)
5. Click anywhere on the page
6. Type your comment
7. See a numbered pin appear! 🎉

## 📖 Documentation

Choose your path:

### For Quick Start
👉 **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute guided tour

### For Users
📚 **[README.md](./README.md)** - Complete user guide

### For Developers
🔧 **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Technical details
📝 **[NOTES.md](./NOTES.md)** - Development notes

### For Troubleshooting
🔍 **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues & fixes

### For Overview
📊 **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was built

## 🎮 Key Features

### Annotation Types
| Icon | Type      | Shortcut | How to Use                    |
|------|-----------|----------|-------------------------------|
| 💬   | Comment   | -        | Click tool → Click page       |
| T    | Text      | `T`      | Press T → Click page          |
| ✓    | Highlight | -        | Select text → Click tool      |
| →    | Arrow     | `A`      | Press A → Drag on page        |

### Keyboard Shortcuts
- `T` - Text tool
- `A` - Arrow tool
- `Esc` - Select tool / Cancel

### Side Panel
Click the ☰ button to:
- Browse all annotated pages
- Filter by status
- Export/Import projects
- Navigate between pages

## 📁 Project Structure

```
apps/anton/
├── src/
│   ├── background/      # Extension service worker
│   ├── content/         # Annotation overlay UI
│   ├── popup/           # Quick toggle popup
│   ├── sidepanel/       # Page browser
│   ├── shared/          # Types, storage, messaging
│   └── lib/             # Utilities
├── public/              # Static assets
├── manifest.json        # Chrome extension config
├── package.json         # Dependencies
└── Documentation files  # This and other .md files
```

## 🛠️ Development

### Watch Mode
```bash
yarn dev
```

After code changes:
1. Save file
2. Go to `chrome://extensions`
3. Click refresh icon
4. Reload test page

### View Logs
- **Content script**: Browser console (F12)
- **Background**: chrome://extensions → "service worker"
- **Side panel**: Right-click in panel → Inspect

## ⚡ Common Tasks

### Add a Comment
1. Click 💬 button
2. Click anywhere
3. Type comment

### Edit Text Label
1. Double-click label
2. Edit text
3. Click away or press Enter

### Reply to Comment
1. Click comment pin
2. Type in reply box
3. Press Enter

### Export Annotations
1. Click ☰ button (toolbar)
2. Click "Import/Export" tab
3. Click "Export as JSON"
4. Share the downloaded file

### Import Annotations
1. Open side panel
2. Import/Export tab
3. Upload JSON or paste it
4. Click Import

## 🎨 What Makes Anton Special

✅ **Auto-save** - No manual save needed, changes persist instantly
✅ **Multi-page** - Track unlimited annotated websites
✅ **Portable** - Export/import via JSON
✅ **Isolated** - Shadow DOM prevents CSS conflicts
✅ **Fast** - Lightweight React app, <500KB
✅ **Dark theme** - Easy on the eyes
✅ **Open source** - Fully transparent code

## 🔧 Troubleshooting

### Extension won't load?
- Check you selected the `dist/` folder (not `src/`)
- Verify build completed: `dist/manifest.json` should exist
- See TROUBLESHOOTING.md for details

### Toolbar doesn't appear?
- Click Anton icon in Chrome toolbar
- Refresh the page
- Check browser console for errors

### Annotations disappeared?
- Verify you're on the exact same URL
- Check side panel → Pages tab
- Try exporting to see if data exists

## 📊 Status

✅ **Phase 1 Complete** (Core Features)
- All annotation types implemented
- Auto-save working
- Side panel with page browser
- Export/import functionality
- Keyboard shortcuts
- Dark theme styling

⚠️ **Known Limitations**
- Highlights stored but not visually rendered (coming soon)
- No thumbnails yet (placeholder icons shown)
- No undo/redo (manual delete only)

🔮 **Phase 2 Planned** (Future)
- Real-time collaboration
- User authentication
- Workspace sharing
- Better highlights
- Undo/redo stack
- Annotation search

## 🤝 Contributing

Found a bug? Want a feature?

1. Check TROUBLESHOOTING.md first
2. Review existing issues
3. Create detailed report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if UI-related)
   - Console errors

## 📝 License

MIT - Use freely, modify as needed, share with attribution.

## 🎯 Next Steps

1. **Install**: Run `yarn install && yarn build`
2. **Load**: Add to Chrome via chrome://extensions
3. **Test**: Visit a website and create annotations
4. **Explore**: Try all annotation types
5. **Share**: Export and send to teammates

---

**Ready to get started?** → [QUICKSTART.md](./QUICKSTART.md)

**Need help?** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Want details?** → [IMPLEMENTATION.md](./IMPLEMENTATION.md)

---

Built with ❤️ using React, TypeScript, Vite, and Tailwind CSS.

🎨 **Happy annotating!**
