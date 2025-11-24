#!/bin/bash
# Quick script to create placeholder icons using base64-encoded PNGs

mkdir -p src/icons

# Create a simple SVG icon
cat > /tmp/icon.svg << 'EOF'
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#10a37f"/>
  <g transform="translate(64, 64)">
    <path d="M0 -24v40M-16 0l16 16 16-16" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M-20 24h40" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>
EOF

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
  echo "Creating icons with ImageMagick..."
  convert -background none /tmp/icon.svg -resize 16x16 src/icons/icon16.png
  convert -background none /tmp/icon.svg -resize 32x32 src/icons/icon32.png
  convert -background none /tmp/icon.svg -resize 48x48 src/icons/icon48.png
  convert -background none /tmp/icon.svg -resize 128x128 src/icons/icon128.png
  echo "Icons created successfully!"
elif command -v inkscape &> /dev/null; then
  echo "Creating icons with Inkscape..."
  inkscape /tmp/icon.svg -w 16 -h 16 -o src/icons/icon16.png
  inkscape /tmp/icon.svg -w 32 -h 32 -o src/icons/icon32.png
  inkscape /tmp/icon.svg -w 48 -h 48 -o src/icons/icon48.png
  inkscape /tmp/icon.svg -w 128 -h 128 -o src/icons/icon128.png
  echo "Icons created successfully!"
else
  echo "Neither ImageMagick nor Inkscape found."
  echo "Please install one of these tools or create icons manually."
  echo ""
  echo "Install ImageMagick:"
  echo "  brew install imagemagick    # macOS"
  echo "  sudo apt install imagemagick # Ubuntu/Debian"
  echo ""
  echo "Or visit https://favicon.io/emoji-favicons/ to generate icons"
  exit 1
fi

rm /tmp/icon.svg
echo "Done! Icons saved to src/icons/"
