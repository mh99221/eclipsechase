# Feature Specification: Viewing Spot Photos
## EclipseChase.is

---

## 1. Overview

Add photo support to the curated viewing spots system. Each viewing spot gets 1–3 photos showing the location's landscape, terrain, and western horizon (where the sun will be during totality). Photos appear on spot detail pages, spot cards on the map, and SEO landing pages.

## 2. Goals

- Help users visually evaluate viewing locations before driving there
- Increase engagement and time-on-site for spot detail pages
- Improve SEO through Google Image Search indexing
- Make social media shares more compelling (OG images per spot)

## 3. Data Model

### 3.1 Schema Change

Replace the existing `photo_url TEXT` column on `viewing_spots` with a JSONB `photos` column:

```sql
ALTER TABLE viewing_spots DROP COLUMN IF EXISTS photo_url;
ALTER TABLE viewing_spots ADD COLUMN photos JSONB DEFAULT '[]';
```

Each element in the `photos` array:

```typescript
interface SpotPhoto {
  filename: string       // e.g. "arnarstapi-coast.webp"
  alt: string            // descriptive alt text for accessibility + SEO
  credit: string         // photographer name or "Unsplash / Name"
  credit_url?: string    // link to original photo or photographer profile
  license: 'unsplash' | 'pixabay' | 'cc-by' | 'cc-by-sa' | 'cc0' | 'nasa-pd'
  is_hero: boolean       // true = used as primary image for cards and OG tags
  horizon_view?: boolean // true = photo shows the western horizon / sky view
}
```

Example data for a viewing spot:

```json
{
  "photos": [
    {
      "filename": "arnarstapi-cliffs-west.webp",
      "alt": "Arnarstapi coastal basalt cliffs facing west toward the Atlantic Ocean",
      "credit": "Unsplash / John Doe",
      "credit_url": "https://unsplash.com/@johndoe",
      "license": "unsplash",
      "is_hero": true,
      "horizon_view": true
    },
    {
      "filename": "arnarstapi-parking.webp",
      "alt": "Parking area at Arnarstapi with Snæfellsjökull glacier visible in the background",
      "credit": "Wikimedia Commons / Jane Smith",
      "credit_url": "https://commons.wikimedia.org/wiki/File:Arnarstapi_parking.jpg",
      "license": "cc-by-sa",
      "is_hero": false,
      "horizon_view": false
    }
  ]
}
```

### 3.2 TypeScript Types

```typescript
// ~/types/spots.ts

export type PhotoLicense = 'unsplash' | 'pixabay' | 'cc-by' | 'cc-by-sa' | 'cc0' | 'nasa-pd'

export interface SpotPhoto {
  filename: string
  alt: string
  credit: string
  credit_url?: string
  license: PhotoLicense
  is_hero: boolean
  horizon_view?: boolean
}

export interface ViewingSpot {
  id: string
  name: string
  slug: string
  lat: number
  lng: number
  region: string
  description: string | null
  parking_info: string | null
  terrain_notes: string | null
  has_services: boolean
  cell_coverage: 'good' | 'limited' | 'none' | null
  totality_duration_seconds: number | null
  totality_start: string | null  // ISO timestamp
  sun_altitude: number | null
  sun_azimuth: number | null
  photos: SpotPhoto[]
}
```

## 4. Image Processing Pipeline

### 4.1 Source → Optimized Image

All source photos must be processed before adding to the repository:

1. **Download** original from source (Unsplash, Pixabay, Wikimedia, NASA)
2. **Resize** to two variants:
   - Full: max 1200px wide, maintain aspect ratio
   - Thumbnail: 600px wide, maintain aspect ratio (for map cards)
3. **Convert** to WebP format (best compression-to-quality ratio, supported by all modern browsers)
4. **Compress** with quality 80 (good balance of quality and file size)
5. **Name** using convention: `{spot-slug}-{descriptor}.webp`
   - Examples: `arnarstapi-cliffs-west.webp`, `kirkjufell-mountain-sunset.webp`
   - Thumbnails: `arnarstapi-cliffs-west-thumb.webp`

### 4.2 Processing Script

Create `scripts/process-spot-photos.sh`:

```bash
#!/bin/bash
# Requires: cwebp (from libwebp-tools) or sharp-cli

INPUT_DIR="./raw-photos"
OUTPUT_DIR="./public/images/spots"

mkdir -p "$OUTPUT_DIR"

for img in "$INPUT_DIR"/*; do
  basename=$(basename "$img" | sed 's/\.[^.]*$//')
  
  # Full size (max 1200px wide)
  cwebp -resize 1200 0 -q 80 "$img" -o "$OUTPUT_DIR/${basename}.webp"
  
  # Thumbnail (600px wide)
  cwebp -resize 600 0 -q 75 "$img" -o "$OUTPUT_DIR/${basename}-thumb.webp"
done
```

Alternative using sharp (Node.js), if preferred:

```typescript
// scripts/process-spot-photos.ts
import sharp from 'sharp'
import { readdirSync } from 'fs'
import { join, parse } from 'path'

const INPUT_DIR = './raw-photos'
const OUTPUT_DIR = './public/images/spots'

const files = readdirSync(INPUT_DIR)

for (const file of files) {
  const { name } = parse(file)
  const input = join(INPUT_DIR, file)

  // Full size
  await sharp(input)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(join(OUTPUT_DIR, `${name}.webp`))

  // Thumbnail
  await sharp(input)
    .resize(600, null, { withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(join(OUTPUT_DIR, `${name}-thumb.webp`))
}
```

### 4.3 File Storage

```
public/
└── images/
    └── spots/
        ├── arnarstapi-cliffs-west.webp          # ~80-150 KB
        ├── arnarstapi-cliffs-west-thumb.webp     # ~30-60 KB
        ├── arnarstapi-parking.webp
        ├── arnarstapi-parking-thumb.webp
        ├── kirkjufell-mountain.webp
        ├── kirkjufell-mountain-thumb.webp
        ├── ...
        └── grotta-lighthouse.webp
```

Images are served directly from Vercel's CDN via `/images/spots/filename.webp`. No Supabase Storage needed.

**Estimated total size**: 30 spots × 2 photos avg × 2 variants (full + thumb) × 80KB avg = ~10 MB. Well within Vercel's free tier static asset limits.

## 5. Components

### 5.1 SpotPhotoHero

Hero image displayed at the top of spot detail pages.

```
File: components/SpotPhotoHero.vue

Props:
  - photo: SpotPhoto (required)
  - spotName: string (required)
  - loading: 'lazy' | 'eager' (default: 'eager' — hero images above the fold)

Renders:
  - Full-width image with rounded corners
  - Photo credit overlay in bottom-right corner (semi-transparent dark background)
  - Credit links to credit_url if provided
  - Proper <img> tag with alt text, width, height, loading attribute
  - Uses srcset with full (1200w) and thumb (600w) for responsive loading

Behavior:
  - On mobile (< 640px): loads thumbnail variant
  - On desktop (>= 640px): loads full variant
  - Applies aspect-ratio: 16/9 with object-fit: cover for consistent layout
```

### 5.2 SpotPhotoGallery

Simple gallery for spot detail pages when a spot has 2+ photos.

```
File: components/SpotPhotoGallery.vue

Props:
  - photos: SpotPhoto[] (required)
  - spotName: string (required)

Renders:
  - If 1 photo: renders just SpotPhotoHero
  - If 2 photos: side-by-side on desktop, stacked on mobile
  - If 3 photos: hero on top, two smaller below (masonry-lite layout)
  - Each photo shows credit on hover/tap
  - No lightbox/modal for MVP — keep it simple
  - All non-hero images use loading="lazy"

CSS:
  - Grid layout using Tailwind: grid grid-cols-1 md:grid-cols-2 gap-2
  - Hero photo spans full width: md:col-span-2 (if 3 photos)
  - Rounded corners: rounded-lg
  - Dark border: border border-[var(--border)]
```

### 5.3 SpotCard (modification)

Modify the existing SpotCard component to show a thumbnail photo.

```
File: components/SpotCard.vue (existing — add photo support)

Changes:
  - If spot has photos with is_hero=true, show hero thumbnail at the top of the card
  - Thumbnail uses the -thumb.webp variant
  - Card layout: image on top, text content below (vertical card)
  - If no photos: show a dark placeholder with a map pin icon
  - Image uses loading="lazy" (cards are often below the fold or in scroll lists)
  - Aspect ratio: 3/2 with object-fit: cover
```

### 5.4 PhotoCredit

Reusable credit display component.

```
File: components/PhotoCredit.vue

Props:
  - credit: string (required)
  - creditUrl?: string
  - license: PhotoLicense (required)
  - variant: 'overlay' | 'inline' (default: 'overlay')

Renders:
  - 'overlay': positioned absolute bottom-right, semi-transparent dark bg, small text
  - 'inline': normal flow, muted text below image
  - Shows: "📷 {credit}" — links to creditUrl if provided
  - License tooltip on hover: "Unsplash License" / "CC BY-SA 4.0" / "Public Domain" etc.
  - Text color: var(--text-secondary)
  - Font size: text-xs
```

## 6. Pages

### 6.1 Spot Detail Page — `/spots/[slug].vue`

```
Layout:
  ┌──────────────────────────────────────┐
  │  ← Back to map          [Navigate]   │  <- header
  ├──────────────────────────────────────┤
  │                                      │
  │         [Hero Photo / Gallery]       │  <- SpotPhotoGallery
  │                                      │
  ├──────────────────────────────────────┤
  │  Arnarstapi                          │
  │  Snæfellsnes Peninsula               │
  │                                      │
  │  ☀ Totality: 1m 56s                 │
  │  🕐 Starts: 17:46:09 UTC            │
  │  📐 Sun: 24° altitude, 265° azimuth │
  ├──────────────────────────────────────┤
  │  Description text...                 │
  ├──────────────────────────────────────┤
  │  🅿 Parking: Free lot, ~30 cars     │
  │  📶 Cell: Limited (Síminn ok)       │
  │  🏪 Services: Café within 200m      │
  │  🏔 Terrain: Coastal cliffs, flat   │
  ├──────────────────────────────────────┤
  │  [Open in Google Maps]               │
  │  [Add to my plan] (Pro)              │
  └──────────────────────────────────────┘
```

### 6.2 OG Meta Tags Per Spot

Each spot page generates its own Open Graph meta tags using the hero photo:

```typescript
// In /spots/[slug].vue
useHead({
  title: `${spot.name} — Eclipse Viewing Spot | EclipseChase.is`,
  meta: [
    { name: 'description', content: `View the 2026 solar eclipse from ${spot.name}, ${spot.region}. ${spot.totality_duration_seconds}s of totality. Parking, terrain, and weather info.` },
    { property: 'og:image', content: `https://eclipsechase.is/images/spots/${heroPhoto.filename}` },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '675' },
    { property: 'og:title', content: `${spot.name} — Eclipse Viewing | EclipseChase.is` },
    { property: 'og:description', content: `${formatDuration(spot.totality_duration_seconds)} of totality. Real-time weather tracking.` },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
})
```

## 7. Image Sourcing Checklist

### 7.1 Viewing Spots — Photo Sources

Priority spots (longest totality, most visitors):

| Spot | Region | Search Terms | Likely Source |
|---|---|---|---|
| Látrabjarg cliffs | Westfjords | "Látrabjarg Iceland" | Unsplash, Wikimedia |
| Patreksfjörður | Westfjords | "Patreksfjördur Iceland" | Wikimedia, Flickr CC |
| Bíldudalur | Westfjords | "Bildudalur Iceland" | Wikimedia, Flickr CC |
| Hellissandur | Snæfellsnes | "Hellissandur Iceland" | Flickr CC, Wikimedia |
| Rif | Snæfellsnes | "Rif Snaefellsnes" | Wikimedia, Flickr CC |
| Ólafsvík | Snæfellsnes | "Olafsvik Iceland" | Unsplash, Wikimedia |
| Arnarstapi | Snæfellsnes | "Arnarstapi Iceland cliffs" | Unsplash (excellent coverage) |
| Búðir | Snæfellsnes | "Budir Iceland church" | Unsplash (iconic black church) |
| Grundarfjörður / Kirkjufell | Snæfellsnes | "Kirkjufell mountain" | Unsplash (heavily covered) |
| Stykkishólmur | Snæfellsnes | "Stykkisholmur Iceland" | Unsplash, Pixabay |
| Akranes | Borgarfjörður | "Akranes Iceland lighthouse" | Unsplash, Wikimedia |
| Borgarnes | Borgarfjörður | "Borgarnes Iceland" | Wikimedia, Flickr CC |
| Grótta lighthouse | Reykjavík | "Grotta lighthouse Reykjavik" | Unsplash (well covered) |
| Seltjarnarnes | Reykjavík | "Seltjarnarnes Iceland" | Unsplash, Wikimedia |
| Reykjanesviti | Reykjanes | "Reykjanesviti lighthouse" | Unsplash, Wikimedia |
| Keflavík area | Reykjanes | "Keflavik Iceland coast" | Pixabay, Wikimedia |

### 7.2 Eclipse Photos (for hero section, OG image, general use)

| What | Search Terms | Source |
|---|---|---|
| Eclipse corona close-up | "total solar eclipse corona" | NASA gallery (public domain) |
| Eclipse composite sequence | "total solar eclipse composite" | NASA SVS (public domain) |
| Eclipse from space (moon shadow) | "eclipse shadow earth ISS" | NASA (public domain) |
| People watching eclipse | "solar eclipse glasses crowd" | Unsplash |

### 7.3 License Compliance Rules

| License | Attribution Required | Commercial Use | Modify/Crop |
|---|---|---|---|
| Unsplash License | No (but appreciated) | Yes | Yes |
| Pixabay License | No | Yes | Yes |
| CC0 | No | Yes | Yes |
| CC-BY | Yes (must credit) | Yes | Yes |
| CC-BY-SA | Yes + share alike | Yes | Yes (same license) |
| CC-BY-NC | Yes | **NO** — cannot use | Yes |
| NASA Public Domain | Credit NASA (guideline) | Yes | Yes |

**Rule**: Never use CC-BY-NC or CC-BY-NC-SA images. The Pro tier makes this a commercial project.

## 8. Seeding Script

Create `scripts/seed-viewing-spots.ts` that seeds both spot data and photo metadata:

```typescript
// scripts/seed-viewing-spots.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const spots = [
  {
    id: 'arnarstapi',
    name: 'Arnarstapi',
    slug: 'arnarstapi',
    lat: 64.7669,
    lng: -23.6267,
    region: 'Snæfellsnes',
    description: 'Dramatic basalt cliff coastline with clear western horizon over the Atlantic. One of the most scenic eclipse viewing locations on the peninsula. Small harbor village with a café and public toilets.',
    parking_info: 'Free gravel parking lot near the harbor, capacity ~30 cars. Additional overflow parking along the road. Expect it to fill early on eclipse day.',
    terrain_notes: 'Flat coastal path along cliff edges. Walking surface is gravel and grass. Unobstructed ocean view to the west and northwest.',
    has_services: true,
    cell_coverage: 'limited',
    totality_duration_seconds: 116,
    totality_start: '2026-08-12T17:46:09Z',
    sun_altitude: 24.2,
    sun_azimuth: 265,
    photos: [
      {
        filename: 'arnarstapi-cliffs-west.webp',
        alt: 'Arnarstapi coastal basalt cliffs and stone arch facing west toward the Atlantic Ocean',
        credit: 'Unsplash / Photographer Name',
        credit_url: 'https://unsplash.com/photos/xxx',
        license: 'unsplash',
        is_hero: true,
        horizon_view: true
      },
      {
        filename: 'arnarstapi-harbor.webp',
        alt: 'Small harbor at Arnarstapi with Snæfellsjökull glacier in the background',
        credit: 'Wikimedia Commons / Author Name',
        credit_url: 'https://commons.wikimedia.org/wiki/File:xxx',
        license: 'cc-by-sa',
        is_hero: false,
        horizon_view: false
      }
    ]
  },
  // ... more spots
]

async function seed() {
  for (const spot of spots) {
    const { error } = await supabase
      .from('viewing_spots')
      .upsert(spot, { onConflict: 'id' })

    if (error) {
      console.error(`Failed to seed ${spot.id}:`, error)
    } else {
      console.log(`Seeded: ${spot.name}`)
    }
  }
}

seed()
```

## 9. Nuxt Image Integration

Use `@nuxt/image` for automatic responsive image handling:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/image'],
  image: {
    format: ['webp'],
    quality: 80,
    screens: {
      sm: 640,
      md: 768,
      lg: 1024,
    }
  }
})
```

Usage in components:

```vue
<!-- SpotPhotoHero.vue -->
<NuxtImg
  :src="`/images/spots/${photo.filename}`"
  :alt="photo.alt"
  width="1200"
  height="675"
  sizes="sm:600px md:900px lg:1200px"
  :loading="loading"
  class="w-full rounded-lg object-cover aspect-video"
/>
```

## 10. Credits Page

Create `/credits` page listing all photo sources:

```
File: pages/credits.vue

Content:
  - "Photo Credits" heading
  - Grouped by license type
  - Each entry: photo thumbnail, photographer name (linked), license badge, spot where it's used
  - Fulfills CC-BY and CC-BY-SA attribution requirements
  - Also credits NASA imagery
  - Link to this page from the footer
```

## 11. Performance Budget

| Metric | Target |
|---|---|
| Hero image load (LCP) | < 2.5s on 3G |
| Thumbnail in SpotCard | < 60 KB per image |
| Full image on detail page | < 150 KB per image |
| Total image payload per spot page | < 400 KB |
| Cumulative Layout Shift from images | 0 (use explicit width/height + aspect-ratio) |

## 12. Acceptance Criteria

- [ ] `viewing_spots` table has `photos` JSONB column with correct schema
- [ ] At least 1 hero photo per curated viewing spot (all ~30 spots)
- [ ] All images are WebP format, max 1200px wide (full) and 600px wide (thumb)
- [ ] SpotCard component shows hero thumbnail with loading="lazy"
- [ ] Spot detail page (`/spots/[slug]`) shows photo gallery with credits
- [ ] OG meta tags per spot page use the hero photo URL
- [ ] Credits page exists at `/credits` with all attribution
- [ ] All images pass Lighthouse performance audit (no oversized images warning)
- [ ] No CC-BY-NC or other non-commercial-compatible images used
- [ ] Image credits.md file in repo documents every image source

## 13. Out of Scope (for now)

- User-uploaded photos
- Photo lightbox / fullscreen viewer
- Image CDN (Cloudinary, imgix) — Vercel static serving is sufficient at this scale
- AI-generated location previews
- 360° panorama views of viewing spots
- Webcam integration for real-time spot views
