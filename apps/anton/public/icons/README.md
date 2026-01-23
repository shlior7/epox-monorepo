# Anton Extension Icons

Place the following icon files in this directory:

- `icon16.png` - 16x16px
- `icon32.png` - 32x32px
- `icon48.png` - 48x48px
- `icon128.png` - 128x128px

## Temporary Placeholder

For now, you can use any icon or create simple colored squares. The extension will work without proper icons, Chrome will just show a default placeholder.

## Quick Icon Generation

You can use any online icon generator or create simple icons with:

```bash
# Using ImageMagick (if installed)
convert -size 16x16 xc:#3b82f6 icon16.png
convert -size 32x32 xc:#3b82f6 icon32.png
convert -size 48x48 xc:#3b82f6 icon48.png
convert -size 128x128 xc:#3b82f6 icon128.png
```

Or just copy any PNG files and rename them to the required sizes.
