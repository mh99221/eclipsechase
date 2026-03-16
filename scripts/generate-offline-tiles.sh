#!/bin/bash
# generate-offline-tiles.sh
#
# This script is a placeholder — offline tiles for the EclipseChase PWA
# are handled client-side via the OfflineManager component, which pre-warms
# the service worker cache by programmatically loading map tiles.
#
# The SW (public/sw.js) uses a cache-first strategy for Mapbox tiles,
# so any tile loaded once is available offline.
#
# To test offline:
# 1. Open /map in Chrome
# 2. Click "Download Offline Maps" (Pro feature)
# 3. Wait for download to complete
# 4. DevTools > Network > Offline
# 5. Map should work with cached tiles

echo "Offline tiles are generated client-side via the OfflineManager component."
echo "See app/components/OfflineManager.vue"
