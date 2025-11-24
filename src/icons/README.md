# Extension Icons

This directory should contain the extension icons in the following sizes:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon32.png` - 32x32 pixels (Windows taskbar)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store, installation)

## Creating Icons

### Option 1: Design Tool
Use any image editor (Figma, Photoshop, GIMP) to create icons with these specifications:
- Background: Transparent or solid color
- Style: Simple, recognizable at small sizes
- Theme: Download arrow or export symbol
- Colors: Match ChatGPT branding (#10a37f) or use neutral colors

### Option 2: Quick Placeholder
For development, create simple colored squares:

```bash
# Using ImageMagick (if installed)
convert -size 16x16 xc:#10a37f icon16.png
convert -size 32x32 xc:#10a37f icon32.png
convert -size 48x48 xc:#10a37f icon48.png
convert -size 128x128 xc:#10a37f icon128.png
```

### Option 3: Use an Icon Generator
1. Visit [favicon.io](https://favicon.io/) or similar
2. Create icon with download/export symbol
3. Generate all sizes
4. Place in this directory

### Option 4: Emoji-based
1. Visit [favicon.io/emoji-favicons/](https://favicon.io/emoji-favicons/)
2. Search for "📥" (inbox tray) or "💾" (floppy disk)
3. Download and rename files

## Icon Design Guidelines

- Keep it simple and recognizable at 16x16
- Use clear, high-contrast design
- Consider both light and dark browser themes
- Test at all sizes to ensure clarity
- Maintain consistent style across all sizes

## SVG Source (Optional)

If designing from scratch, start with an SVG for crisp scaling:

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#10a37f"/>
  <path d="M64 32v48M44 60l20 20 20-20" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M40 88h48" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
</svg>
```

Then export to PNG at each required size.
