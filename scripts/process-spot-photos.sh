#!/bin/bash
# Process raw photos into optimized WebP variants for spot pages.
# Requires: cwebp (from libwebp-tools)
#
# Usage:
#   ./scripts/process-spot-photos.sh
#
# Place source images in ./raw-photos/ before running.

INPUT_DIR="./raw-photos"
OUTPUT_DIR="./public/images/spots"

if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: $INPUT_DIR directory not found. Create it and add source images."
  exit 1
fi

if ! command -v cwebp &> /dev/null; then
  echo "Error: cwebp not found. Install libwebp-tools first."
  echo "  macOS: brew install webp"
  echo "  Ubuntu: sudo apt install webp"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

count=0
for img in "$INPUT_DIR"/*; do
  [ -f "$img" ] || continue
  basename=$(basename "$img" | sed 's/\.[^.]*$//')

  # Full size (max 1200px wide)
  cwebp -resize 1200 0 -q 80 "$img" -o "$OUTPUT_DIR/${basename}.webp"

  # Thumbnail (600px wide)
  cwebp -resize 600 0 -q 75 "$img" -o "$OUTPUT_DIR/${basename}-thumb.webp"

  count=$((count + 1))
  echo "Processed: ${basename} (full + thumb)"
done

echo ""
echo "Done. Processed $count images into $OUTPUT_DIR"
