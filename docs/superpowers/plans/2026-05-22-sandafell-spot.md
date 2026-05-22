# Sandafell Spot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sandafell Mountain (a 367 m summit above Þingeyri in Dýrafjörður) as a curated viewing spot in production — the first Dýrafjörður spot since `thingeyri-shore` was dropped in May 2026, and the first true mountain-summit hike in the Westfjords selection.

**Architecture:** Data-only change. Two phases. **Phase 1** (this repo): seed SQL, horizon-check override, advisories migration, IS translation generator update, guide page link. Single commit. **Phase 2** (after the maintainer applies the SQL in Supabase and the live API returns the new spot): regenerate `historical-weather.json` and `seed-horizon-checks.sql` against the live API, apply the second SQL batch in Supabase, commit the regenerated JSON. **No hero photo at launch** — deferred to a follow-up since no leftover image exists in the repo (unlike Hæstahjallafoss).

**Tech Stack:** Nuxt 4, Supabase (Postgres), Vue 3, Tailwind, Nuxt Content (markdown), Node scripts for grid lookup / horizon recompute / cloud history fetch / IS translation generation.

**Source spec:** [docs/superpowers/specs/2026-05-22-sandafell-spot-design.md](../specs/2026-05-22-sandafell-spot-design.md)

**Sibling commit (already merged):** `3cf8f6a` — Hæstahjallafoss Phase 1. This plan builds on the same patterns but uses a fresh slug, fresh migration number (007), and a different KNOWN_ELEVATION override.

**Key correction since spec:** The grid lookup yields **100 seconds** of totality at the summit (start `2026-08-12T17:44:17Z`). The spec didn't claim a specific duration but the description in Task 1 uses `~100 seconds`.

**Slug / ID:** `sandafell` / `sandafell-thingeyri`. The existing stale `thingeyri` row in `seed-viewing-spots-v2.sql` (lines 28–35, dropped from production in commit 4bf2b64) is **replaced** by this new row — per the spec's explicit non-goal of re-introducing the shore parking spot. The trailhead_lat/lng pin covers village-level access.

---

## Phase 1 — code-side changes (this repo)

### Task 1: Replace the stale `thingeyri-shore` seed row with the new Sandafell row

**Files:**
- Modify: `scripts/seed-viewing-spots-v2.sql:28-35`

The existing block we are replacing:

```sql
INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('thingeyri', 'Þingeyri Village Shore', 'thingeyri-shore',
  65.8726, -23.5020, 'westfjords',
  'Þingeyri sits on the south shore of Dýrafjörður, which runs almost perfectly east-west. The fjord acts as a natural viewing corridor pointing directly toward the open ocean — perfectly aligned with the sun''s position at totality. Near the central line for close to maximum duration.',
  'Open gravel and grass area along the shore road. Informal parking, no restrictions.',
  'Flat coastal strip with gravel shore. Fjord opens to the west with no obstructions.',
  true, 'good', 135, '2026-08-12T17:45:05Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;
```

- [ ] **Step 1: Replace the block above with the new long-form INSERT (includes trail columns)**

Use the long-form INSERT pattern matching the kirkjufell hiking row (lines ~141–149) and the haestahjallafoss-dynjandi row from commit 3cf8f6a (lines ~18–26).

```sql
INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('sandafell', 'Sandafell Summit (Þingeyri)', 'sandafell-thingeyri',
  65.87239273496029, -23.50567126937135, 'westfjords',
  'A 367 m mountain summit on the south shore of Dýrafjörður, directly above the fishing village of Þingeyri. The climb earns you the single best horizon on the entire site — over 22° of clearance to the west-southwest, with the open Atlantic visible past the fjord mouth and the next blocking terrain more than 8 km away across the water. A 60-minute hike, but the panorama is the whole point. Best suited to viewers who''d rather earn a clean horizon than compromise on a roadside spot.',
  'Trailhead parking at the south-east edge of Þingeyri village, off the upper village road. Small gravel area, free. Þingeyri itself has a grocery and petrol; use them before starting the climb.',
  '2 km of trail switching back across rocky slopes from the village (117 m) to the broad summit plateau (367 m). 60 minutes up for a normally-fit walker, less coming down. No shelter at the summit — hiking boots, windproof shell, layers, and water are essentials. The summit plateau is broad and flat enough for several tripods spread out without crowding.',
  false, 'none', 100, '2026-08-12T17:44:17Z', 24, 249,
  'hike', 2.0, 60, 'moderate', 250, 65.86123054085608, -23.477419169626966)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;
```

Notes:
- Single quote in `you''d` is correctly Postgres-escaped (doubled).
- `cell_coverage` is `'none'` (summit and trail have no signal — village itself does, but the curated spot point is the summit).
- `spot_type` is `'hike'`, `difficulty` is `'moderate'` (not `'easy'` — this is a 60-minute mountain hike, not a stroll). This prevents the recommendation engine from routing Family / First-Timer profiles here.

- [ ] **Step 2: Verify the SQL block parses syntactically**

Run: `node -e "const fs = require('fs'); const sql = fs.readFileSync('scripts/seed-viewing-spots-v2.sql','utf8'); const m = sql.match(/'sandafell',[\\s\\S]+?trailhead_lng=EXCLUDED\\.trailhead_lng;/); console.log(m ? 'BLOCK PRESENT, length=' + m[0].length : 'MISSING');"`

Expected: `BLOCK PRESENT, length=<some integer around 1900-2300>`. If `MISSING`, the edit didn't land cleanly — re-do and check single-quote escaping in the description.

- [ ] **Step 3: Confirm the old thingeyri-shore row is gone**

Run: `grep -c "'thingeyri'" scripts/seed-viewing-spots-v2.sql`

Expected: `0`.

Run: `grep -c "'thingeyri-shore'" scripts/seed-viewing-spots-v2.sql`

Expected: `0`.

- [ ] **Step 4: Stage**

```bash
git add scripts/seed-viewing-spots-v2.sql
```

(Do not commit yet — Task 6 commits all Phase 1 changes together.)

---

### Task 2: Add KNOWN_ELEVATION override for the Sandafell summit

**Files:**
- Modify: `scripts/recompute-spot-horizons.mjs` — the `KNOWN_ELEVATION` constant (currently lines 41–44 after the Hæstahjallafoss addition in commit 3cf8f6a)

The 30 m DEM under-reports the summit by 13 m (DEM 354 m vs. true 367 m). Without an override, the horizon check would still pass `clear` (the clearance is huge), but the on-page "observer elevation" stat would read 354 m instead of the correct 367 m.

- [ ] **Step 1: Extend the constant**

Current state after the Hæsta commit:

```js
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
  'haestahjallafoss-dynjandi': 99,
}
```

Replace with:

```js
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
  'haestahjallafoss-dynjandi': 99,
  'sandafell-thingeyri': 367,
}
```

(The dict key must match the live API's `spot.slug` string.)

- [ ] **Step 2: Verify parsing**

Run: `node -e "import('./scripts/recompute-spot-horizons.mjs').catch(e => console.log('expected fail head:', String(e).split('\\n')[0]))"`

The script will eventually fail trying to fetch the new spot from the live API (because it isn't there yet — that's Phase 2). Acceptable errors mention `fetch`, `API error`, `ENOTFOUND`, `ECONNREFUSED`, or runtime errors after fetch. **Unacceptable** errors mention `SyntaxError`, `ReferenceError`, or `Unexpected token` — those indicate the edit broke parsing.

- [ ] **Step 3: Stage**

```bash
git add scripts/recompute-spot-horizons.mjs
```

---

### Task 3: Append Sandafell link to the guide page

**Files:**
- Modify: `content/guide.md:39`

After the Hæsta commit (`3cf8f6a`), line 39 reads:

```markdown
Top spots: [Látrabjarg Cliffs](/spots/latrabjarg-cliffs) · [Breiðavík Beach](/spots/breidavik-beach) · [Patreksfjörður Beach](/spots/patreksfjordur-beach) · [Ísafjörður Harbour](/spots/isafjordur-harbour) · [Hæstahjallafoss (Dynjandi)](/spots/haestahjallafoss-dynjandi)
```

- [ ] **Step 1: Append the Sandafell link**

Replace with:

```markdown
Top spots: [Látrabjarg Cliffs](/spots/latrabjarg-cliffs) · [Breiðavík Beach](/spots/breidavik-beach) · [Patreksfjörður Beach](/spots/patreksfjordur-beach) · [Ísafjörður Harbour](/spots/isafjordur-harbour) · [Hæstahjallafoss (Dynjandi)](/spots/haestahjallafoss-dynjandi) · [Sandafell Summit](/spots/sandafell-thingeyri)
```

- [ ] **Step 2: Verify**

Run: `grep -c "sandafell-thingeyri" content/guide.md`

Expected: `1`.

Run: `grep -c "haestahjallafoss-dynjandi" content/guide.md`

Expected: `1` (the previous PR's link is still present).

- [ ] **Step 3: Stage**

```bash
git add content/guide.md
```

---

### Task 4: Add advisories migration (4 entries — 2 warn + 2 info)

**Files:**
- Create: `scripts/migrations/007-sandafell-advisories.sql`

Four entries in `{level, title, body}` shape. Severity ordering matters: **the two `warn` entries come first** so `useAdvisories().topLevel` resolves to `warn`. The IS translation generator's `warnings_titles` array (added in Task 5) must list these four titles in this same order.

- [ ] **Step 1: Create the migration file with exact contents below**

```sql
-- Seed four advisories for sandafell-thingeyri:
--   warn — summit can be in cloud while the fjord is clear
--   warn — real hike, kit + timing essentials
--   info — cloudiest region for the eclipse
--   info — no cell coverage above the village
-- Severity ordering matters: the two warns come first so
-- useAdvisories().topLevel resolves to warn. The IS translation
-- generator's warnings_titles array must list these four titles in
-- the same order.

UPDATE viewing_spots
SET warnings = '[
  {"level":"warn","title":"Summit can be in cloud while the fjord is clear","body":"At 367 m, Sandafell sits in the orographic cloud band that often forms on Westfjords summits even when the fjord below is sunny. Before committing to the hike, glass the summit from Þingeyri village or check the Vegagerðin webcam on Route 60 — if the top is shrouded, consider descending to the village shore or driving 50 minutes south to Hæstahjallafoss in Arnarfjörður instead."},
  {"level":"warn","title":"Real hike, not a stroll","body":"2 km / ~60 minutes one way with 250 m vertical gain on rocky terrain. Hiking boots, layers, and a wind shell are essential — there is no shelter at the summit and conditions are noticeably cooler and windier than the village. Allow 90 minutes round trip plus eclipse viewing time; arrive at parking by 14:30 UTC at the latest."},
  {"level":"info","title":"Cloudiest region for the eclipse","body":"Aug 12 climatology shows 7 of last 10 years overcast at totality (avg 83% cloud). Better than other Westfjords spots in the dataset but still trails Reykjanes by ~2× clear-sky odds. Consider Snæfellsnes or Reykjanes as a backup if forecasts trend poor in the final 72 hours."},
  {"level":"info","title":"No cell coverage","body":"Þingeyri village has signal but the trail and summit do not. Download offline tiles and the spot detail before leaving the village. Closest reliable coverage is the village itself."}
]'::jsonb
WHERE slug = 'sandafell-thingeyri';
```

- [ ] **Step 2: Verify the JSON parses**

Run: `node -e "const fs=require('fs'); const sql=fs.readFileSync('scripts/migrations/007-sandafell-advisories.sql','utf8'); const m=sql.match(/\\[[\\s\\S]*\\]/); const arr=JSON.parse(m[0]); console.log('Advisories:', arr.length); for (const a of arr) console.log('  -', a.level, '|', a.title);"`

Expected output:

```
Advisories: 4
  - warn | Summit can be in cloud while the fjord is clear
  - warn | Real hike, not a stroll
  - info | Cloudiest region for the eclipse
  - info | No cell coverage
```

If the count is wrong or order is different, the SQL JSON literal has a bug — fix before continuing.

- [ ] **Step 3: Stage**

```bash
git add scripts/migrations/007-sandafell-advisories.sql
```

---

### Task 5: Add Icelandic translation entry to the generator

**Files:**
- Modify: `scripts/internal/generate-spot-translations-is.mjs` — add a new entry to the `is` object

The generator's `is` object is keyed by spot slug. After the Hæsta commit (3cf8f6a), the Hæstahjallafoss entry sits between `grotta-lighthouse-reykjavik` and `hellissandur-village`. Insert the Sandafell entry alphabetically — slugs starting with `s` fall after `r*` entries. Locate `reykjanesta-lighthouse` and insert `sandafell-thingeyri` after it (and before any other `s*` entries like `saxholl-crater` if they exist alphabetically; if `saxholl-crater` exists, insert before it so the alphabetical convention holds).

- [ ] **Step 1: Identify the insertion point**

Run: `grep -n "^  '[r-t]" scripts/internal/generate-spot-translations-is.mjs | head -10`

That lists all keys starting with `r`, `s`, or `t` in the IS object so you can place the new entry alphabetically. Pick the line position right after the closing brace of the entry whose slug is the alphabetically-immediately-prior one (likely `reykjanesta-lighthouse`).

- [ ] **Step 2: Insert the new entry**

Add this exact block at the chosen insertion point (mind the leading and trailing blank lines / commas to match the surrounding style):

```js
  'sandafell-thingeyri': {
    name: 'Sandafell (Þingeyri)',
    description:
      'Fjallstindur í 367 m hæð á suðurströnd Dýrafjarðar, beint fyrir ofan sjávarþorpið Þingeyri. Uppgangan vinnur fyrir besta sjóndeildarhring síðunnar — yfir 22° af frí útsýni til vest-suðvesturs, með opið Atlantshaf sýnilegt út fyrir fjarðarmynnið og næsta hindrandi landslag meira en 8 km í burtu yfir hafið. 60 mínútna ganga — panóraman er málið. Hentar best þeim sem vilja heldur vinna sér inn hreinan sjóndeildarhring en gera málamiðlanir með stað við veginn.',
    parking_info:
      'Bílastæði við gönguleiðina í suðausturhluta Þingeyrarþorps, út frá efri þorpsgötunni. Lítið malarsvæði, frítt. Þingeyri sjálft er með matvöruverslun og bensínstöð; nýttu þau áður en gangan hefst.',
    terrain_notes:
      '2 km af gönguleið sem sneiðir upp grýtta hlíð frá þorpinu (117 m) að breiðri tindahásléttu (367 m). 60 mínútur upp fyrir göngumann í eðlilegu formi, styttra niður. Ekkert skjól á tindinum — gönguskór, vindheld skel, lögskipt klæðnaður og vatn eru nauðsynleg. Tindahásléttan er nógu breið og slétt fyrir nokkra þrífæti með góðu rými á milli.',
    warnings_titles: [
      'Tindurinn getur verið í þoku þótt fjörðurinn sé heiður',
      'Alvöru ganga, ekki rölt',
      'Skýjaríkasta svæðið fyrir sólmyrkvann',
      'Ekkert farsímasamband',
    ],
  },
```

The `warnings_titles` array MUST have exactly 4 entries in the same order as the advisories migration in Task 4 (warn cloud-on-summit, warn hike, info regional climatology, info cell).

- [ ] **Step 3: Verify parsing**

Run: `node -e "import('./scripts/internal/generate-spot-translations-is.mjs').catch(e => console.log('expected fail head:', String(e).split('\\n')[0]))"`

Acceptable error: anything mentioning `parsed-spots.json`, `enBySlug`, or a coverage mismatch listing `sandafell-thingeyri` as "extra IS" (because parsed-spots.json doesn't have the new spot yet — same pattern as the Hæsta task).

Unacceptable error: `SyntaxError`, `Unexpected token`, or an error originating from the IS object literal.

Do NOT regenerate the `.sql` file. The generator reads from `raw-photos/parsed-spots.json` which won't include the new spot until Phase 2 (Task 9).

- [ ] **Step 4: Stage**

```bash
git add scripts/internal/generate-spot-translations-is.mjs
```

---

### Task 6: Commit Phase 1 (a single coherent commit)

- [ ] **Step 1: Verify all expected files are staged**

Run: `git status --short`

Expected output (exact list, in any order — there should be no untracked work-tree changes from earlier phase 1 except the optional `.claude/scheduled_tasks.lock` which is unrelated):

```
M  content/guide.md
M  scripts/internal/generate-spot-translations-is.mjs
M  scripts/recompute-spot-horizons.mjs
M  scripts/seed-viewing-spots-v2.sql
A  scripts/migrations/007-sandafell-advisories.sql
```

If anything is missing or unexpected (e.g., a stray `M scripts/output/seed-horizon-checks.sql` from a verification run — that's harmless and should remain UN-staged), stop and reconcile before committing.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(spots): add Sandafell Summit (Þingeyri) as Westfjords mountain hike spot

Supersedes the dropped thingeyri-shore parking-side spot with a 367m
mountain summit on the south shore of Dýrafjörður. Slug
sandafell-thingeyri. First true mountain-summit hike in the Westfjords
selection; 22.6° horizon clearance is the best on the entire site.

Code-side changes (Phase 1):
- seed-viewing-spots-v2.sql: replace stale thingeyri-shore row with
  sandafell-thingeyri (100s totality from grid lookup, hike spot_type,
  moderate difficulty, 2km / 60min / 250m vert, trailhead at south-east
  edge of Þingeyri village)
- recompute-spot-horizons.mjs: KNOWN_ELEVATION['sandafell-thingeyri']
  = 367 to correct the 30m DEM under-report at the summit
- migrations/007-sandafell-advisories.sql: 2× warn + 2× info
  (summit-cloud risk, hike seriousness, regional climatology, no cell)
- content/guide.md: append spot to Westfjords link list
- generate-spot-translations-is.mjs: add IS entry (regen deferred to Phase 2)

No hero photo at launch — deferred as P1 follow-up since no leftover
image exists (unlike Hæstahjallafoss which reused the Dynjandi photo).

Phase 2 (after maintainer applies SQL to Supabase):
- Run recompute-spot-horizons.mjs against live API → apply horizon-check UPDATE
- Run fetch-historical-weather.mjs against live API → commit JSON diff
- Run generate-spot-translations-is.mjs after refreshed parsed-spots.json → apply IS UPDATE

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Confirm commit landed and tests passed**

Run: `git log -1 --oneline`

Expected: a single line beginning with a fresh commit hash and the message `feat(spots): add Sandafell Summit (Þingeyri) as Westfjords mountain hike spot`. The pre-commit hook will run the vitest suite; if it fails, fix the failure and re-commit (do not amend or use `--no-verify`).

---

## Phase 1 handoff: maintainer applies SQL in Supabase

After Phase 1 commits and the next deploy lands:

1. Open Supabase SQL editor for the production project.
2. Run the new `INSERT … ON CONFLICT` block from `scripts/seed-viewing-spots-v2.sql` (the `'sandafell'` block edited in Task 1).
3. Run `scripts/migrations/007-sandafell-advisories.sql` (the file created in Task 4) — single `UPDATE` populating the `warnings` JSONB.
4. Verify by visiting `https://eclipsechase.is/api/spots/sandafell-thingeyri` — should return a 200 with the new spot's full payload including 4 advisories (sans `horizon_check` and IS translation; those come in Phase 2).

Phase 2 cannot begin until all four checks pass.

---

## Phase 2 — post-deploy regeneration

### Task 7: Regenerate horizon checks and apply UPDATE in Supabase

**Files:**
- Generates: `scripts/output/seed-horizon-checks.sql` (gitignored / scratch — review only)

- [ ] **Step 1: Run the recompute script against the live API**

```bash
node scripts/recompute-spot-horizons.mjs
```

Expected: the script lists 30 spots (29 from after the Hæsta deploy + 1 for Sandafell). The line for `sandafell-thingeyri` should read approximately:

```
  clear     clearance= 22.6°  obs_elev= 368.7m  sandafell-thingeyri
```

If the verdict for `sandafell-thingeyri` is anything other than `clear`, or `obs_elev` is materially different from 368.7m, **stop and investigate** — the spec assumes clear-verdict copy with the spectacular 22.6° clearance.

- [ ] **Step 2: Apply the generated SQL in Supabase**

The script writes `scripts/output/seed-horizon-checks.sql`. Open it, locate the `UPDATE … WHERE slug = 'sandafell-thingeyri'` statement, copy and run it in the Supabase SQL editor. (The full file is idempotent and re-runnable — running the whole thing is also safe and updates every spot's horizon_check including any drift from re-running with the latest algorithm constants.)

- [ ] **Step 3: Verify in production**

Run: `curl -s https://eclipsechase.is/api/spots/sandafell-thingeyri | node -e "let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{const j=JSON.parse(s); const h=j.spot?.horizon_check; console.log('verdict:', h?.verdict, 'clearance:', h?.clearance_degrees);})"`

Expected: `verdict: clear clearance: 22.6` (or close to it).

---

### Task 8: Regenerate the 10-year cloud history

**Files:**
- Modify: `public/eclipse-data/historical-weather.json`

- [ ] **Step 1: Run the fetch script against the live API**

```bash
node scripts/fetch-historical-weather.mjs --api=https://eclipsechase.is
```

Expected: the script processes 30 spots (or 29 if Hæsta's Phase 2 hasn't happened yet — either way it should include `sandafell-thingeyri` now that the seed row is in production). The final line for the new spot should be approximately:

```
  sandafell-thingeyri               ... clear 2/10 · avg 83% clouds
```

If `clear` is materially different from 2/10 or `avg` is materially different from 83%, the Open-Meteo numbers shifted since the spec — verify the script ran without errors and accept whatever the live API/ERA5 returns (ERA5 occasionally drifts by 1–2% on re-pulls).

- [ ] **Step 2: Stage and commit the JSON diff**

```bash
git diff --stat public/eclipse-data/historical-weather.json
git add public/eclipse-data/historical-weather.json
git commit -m "data(spots): add 10-year cloud history for sandafell-thingeyri"
```

---

### Task 9: Regenerate IS translation SQL and apply in Supabase

**Files:**
- Modify: `raw-photos/parsed-spots.json` (regenerated by `scripts/internal/parse-spots.mjs`)
- Modify: `scripts/seed-spot-translations-is.sql` (regenerated by `scripts/internal/generate-spot-translations-is.mjs`)

Prereq: the maintainer must export the current `viewing_spots` table from Supabase to `raw-photos/viewing_spots_rows.sql` (the file the parser reads), per the workflow documented in the header of `scripts/seed-spot-translations-is.sql`.

- [ ] **Step 1: Refresh the production-spots snapshot**

Maintainer step (Supabase dashboard → Table editor → `viewing_spots` → Export → SQL → save to `raw-photos/viewing_spots_rows.sql`).

- [ ] **Step 2: Regenerate the parsed spots JSON**

```bash
node scripts/internal/parse-spots.mjs
```

Expected: writes `raw-photos/parsed-spots.json` containing 30 spots, including `sandafell-thingeyri`.

- [ ] **Step 3: Regenerate the IS translations SQL**

```bash
node scripts/internal/generate-spot-translations-is.mjs
```

Expected: writes `scripts/seed-spot-translations-is.sql` with the new spot's translation entry near the existing entries. Coverage line in the file header should now read "Coverage: 30 spots" (29 after Hæsta's Phase 2 + 1).

- [ ] **Step 4: Apply the IS UPDATE in Supabase**

In the Supabase SQL editor, locate the regenerated `WITH translations(spot_slug, locale, name, description, parking_info, terrain_notes, warnings) AS (VALUES …)` block and find the row for `'sandafell-thingeyri'`. Either run the entire script (idempotent `ON CONFLICT (spot_slug, locale) DO UPDATE`) or extract just the new row's INSERT.

- [ ] **Step 5: Verify**

Run: `curl -s "https://eclipsechase.is/api/spots/sandafell-thingeyri?locale=is" | node -e "let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{const j=JSON.parse(s); console.log('IS name:', j.spot?.name); console.log('IS desc start:', (j.spot?.description||'').slice(0, 80));})"`

Expected: `IS name: Sandafell (Þingeyri)` and a description starting with `Fjallstindur í 367 m hæð …`.

- [ ] **Step 6: Stage and commit the regenerated files**

```bash
git add raw-photos/parsed-spots.json scripts/seed-spot-translations-is.sql
git commit -m "data(spots): regenerate IS translations including sandafell-thingeyri"
```

---

## Final acceptance

The change is done when all of these pass:

- `GET https://eclipsechase.is/api/spots` returns 30 spots (or 29 if Hæsta's Phase 2 hasn't shipped yet — either way Sandafell is in the list).
- `GET https://eclipsechase.is/api/spots/sandafell-thingeyri` returns the full payload including `horizon_check.verdict === 'clear'` and `clearance_degrees ≈ 22.6`.
- `public/eclipse-data/historical-weather.json` contains a `sandafell-thingeyri` entry.
- The spot detail page at `/spots/sandafell-thingeyri` renders: placeholder hero (real photo deferred), 4 advisories with warn-level topmost, trailhead pin at the village edge, summit pin on the location map, Icelandic translation when locale toggled to `is`.
- The Westfjords link list on `/guide` includes both Hæstahjallafoss and Sandafell links.

## Photo follow-up (deferred, non-blocking)

This plan ships Sandafell with the spot detail page's placeholder hero — no `sandafell-thingeyri-hero.webp` exists in the repo. Worth tracking as a separate P1 task:

1. Source a free-licensed photo. Wikimedia Commons has a few Sandafell summit shots looking out over Dýrafjörður under CC-BY-SA 4.0 — verify licence and attribute properly. Or Martin's own photo if a trip happens before launch.
2. Run through `scripts/process-spot-photos.mjs` to produce the `sandafell-thingeyri-hero.webp` + `-thumb.webp` pair in `public/images/spots/`.
3. Add a `spot_photos` JSONB UPDATE row to `scripts/seed-spot-photos.sql` following the existing pattern (see the Hæstahjallafoss row updated in commit 3cf8f6a as the model).
4. Apply the UPDATE in Supabase.

This is a separate small commit, not part of this plan.
