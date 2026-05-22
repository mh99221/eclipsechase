# Hæstahjallafoss Spot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Hæstahjallafoss (a named cascade on the Dynjandi waterfall trail in Arnarfjörður) as a curated viewing spot in production — the first Arnarfjörður spot since `dynjandi` was dropped in May 2026.

**Architecture:** Data-only change. Two phases. **Phase 1** (this repo): seed SQL, photo rename, horizon-check override, IS translation generator update, guide page link. Single commit. **Phase 2** (after the maintainer applies the SQL in Supabase and the live API returns the new spot): regenerate `historical-weather.json` and `seed-horizon-checks.sql` against the live API, apply the second SQL batch in Supabase, commit the regenerated JSON.

**Tech Stack:** Nuxt 4, Supabase (Postgres), Vue 3, Tailwind, Nuxt Content (markdown), Node scripts for grid lookup / horizon recompute / cloud history fetch / IS translation generation.

**Source spec:** [docs/superpowers/specs/2026-05-22-haestahjallafoss-spot-design.md](../specs/2026-05-22-haestahjallafoss-spot-design.md)

**Key correction since spec:** The grid lookup yields **95 seconds** of totality (start `2026-08-12T17:44:42Z`), not the ~130s I'd assumed in spec copy. The description text in Task 1 reflects this corrected value.

**Slug / ID:** `haestahjallafoss` / `haestahjallafoss-dynjandi`. The existing stale `dynjandi` row in `seed-viewing-spots-v2.sql` (lines 18–25, dropped from production in commit 4bf2b64) is **replaced** by this new row — per the spec's explicit non-goal of resurrecting the parking-lot spot.

---

## Phase 1 — code-side changes (this repo)

### Task 1: Replace the stale `dynjandi` seed row with the new Hæstahjallafoss row

**Files:**
- Modify: `scripts/seed-viewing-spots-v2.sql:18-25`

The existing block we are replacing:

```sql
INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('dynjandi', 'Dynjandi Viewpoint', 'dynjandi-arnarfjordur',
  65.7328, -23.1793, 'westfjords',
  'The parking area at the base of iconic Dynjandi waterfall sits at the head of Arnarfjörður, one of the widest fjords in the Westfjords. The fjord opens directly to the west, providing a clear low horizon toward the ocean. Close to the central line where duration approaches the maximum for Iceland.',
  'Dedicated gravel car park at end of Route 60 spur road, ~50 vehicles. Free.',
  'Flat gravel parking area and grassy meadow at fjord head. Waterfall backdrop.',
  false, 'limited', 138, '2026-08-12T17:45:10Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;
```

- [ ] **Step 1: Replace the block above with the new long-form INSERT (includes trail columns)**

Use the long-form INSERT pattern from the Snæfellsnes hiking spots (e.g., `kirkjufell` at lines 141–149) which includes `trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng`.

```sql
INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('haestahjallafoss', 'Hæstahjallafoss (Dynjandi Trail)', 'haestahjallafoss-dynjandi',
  65.73334571021223, -23.201396166460484, 'westfjords',
  'One of the named cascades on the Dynjandi waterfall trail, halfway up the cliff at the head of Arnarfjörður. A short walk from the parking brings you to a small ledge where the river drops past you toward the fjord — directly into the sun''s position at totality. The fjord opens west-northwest to open ocean, giving a clear horizon despite the surrounding south wall. ~95 seconds of totality.',
  'Marked Dynjandi parking at the end of the Route 60 spur road. Gravel, ~50 spaces, free. Pit toilet, no other services. The trail begins at the south end of the lot.',
  'Stepped trail climbs the slope past the waterfall cascades, switchbacks over rocks and boulders. ~670 m, ~95 m vertical, 20 minutes one way. The ledge at Hæstahjallafoss is grassy with a low natural rock guard — comfortable footing but exposed to wind. Tripod-friendly footprint for one or two photographers; bring a buddy if shooting in the dark after totality.',
  false, 'none', 95, '2026-08-12T17:44:42Z', 24, 249,
  'hike', 0.67, 20, 'easy', 95, 65.7367007572071, -23.209297687333873)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;
```

Notes for the editor:
- Single quotes in the description are doubled (`sun''s`) per Postgres escaping.
- `cell_coverage` is `'none'` (Arnarfjörður head has no signal).
- `spot_type` is `'hike'` (matches the Snæfellsjökull-summit pattern); `difficulty` is `'easy'` despite being a hike — the walk is short.

- [ ] **Step 2: Verify the SQL block parses syntactically**

Run: `node -e "const fs = require('fs'); const sql = fs.readFileSync('scripts/seed-viewing-spots-v2.sql','utf8'); const m = sql.match(/'haestahjallafoss',[\\s\\S]+?trailhead_lng=EXCLUDED\\.trailhead_lng;/); console.log(m ? 'BLOCK PRESENT, length=' + m[0].length : 'MISSING');"`

Expected: `BLOCK PRESENT, length=<some integer around 1800-2200>`. If `MISSING`, the edit didn't land cleanly — re-do the edit and check that single-quote escaping is intact.

- [ ] **Step 3: Stage the file**

```bash
git add scripts/seed-viewing-spots-v2.sql
```

(Do not commit yet — Task 8 commits all Phase 1 changes together.)

---

### Task 2: Replace the stale photo UPDATE in seed-spot-photos.sql

**Files:**
- Modify: `scripts/seed-spot-photos.sql:15`

- [ ] **Step 1: Replace the line in place**

Line 15 currently reads:

```sql
UPDATE viewing_spots SET photos = '[{"filename":"dynjandi-arnarfjordur-hero.webp","alt":"Dynjandi waterfall cascading down the mountainside in Arnarfjordur","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'dynjandi-arnarfjordur';
```

Replace with:

```sql
UPDATE viewing_spots SET photos = '[{"filename":"haestahjallafoss-dynjandi-hero.webp","alt":"Fjallfoss, the main waterfall in the Dynjandi cascade, with autumn vegetation in the foreground","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'haestahjallafoss-dynjandi';
```

- [ ] **Step 2: Verify**

Run: `grep -c "dynjandi-arnarfjordur" scripts/seed-spot-photos.sql`

Expected: `0` (no remaining references to the old slug — the file becomes self-consistent with prod, which has neither row).

Run: `grep "haestahjallafoss-dynjandi" scripts/seed-spot-photos.sql`

Expected: one matching line containing the new UPDATE.

- [ ] **Step 3: Stage**

```bash
git add scripts/seed-spot-photos.sql
```

---

### Task 3: Rename the hero photo files

**Files:**
- Rename: `public/images/spots/dynjandi-arnarfjordur-hero.webp` → `public/images/spots/haestahjallafoss-dynjandi-hero.webp`
- Rename: `public/images/spots/dynjandi-arnarfjordur-hero-thumb.webp` → `public/images/spots/haestahjallafoss-dynjandi-hero-thumb.webp`

- [ ] **Step 1: git mv both files (preserves blame history)**

```bash
git mv public/images/spots/dynjandi-arnarfjordur-hero.webp public/images/spots/haestahjallafoss-dynjandi-hero.webp
git mv public/images/spots/dynjandi-arnarfjordur-hero-thumb.webp public/images/spots/haestahjallafoss-dynjandi-hero-thumb.webp
```

- [ ] **Step 2: Verify**

Run: `ls public/images/spots/haestahjallafoss* public/images/spots/dynjandi* 2>&1`

Expected: two `haestahjallafoss-dynjandi-hero*.webp` files listed; the `dynjandi-*` ls returns "No such file or directory" or similar.

Files are already staged by `git mv` — no extra `git add` needed.

---

### Task 4: Add KNOWN_ELEVATION override for the Hæstahjallafoss cliff ledge

**Files:**
- Modify: `scripts/recompute-spot-horizons.mjs:41-43`

The 30 m DEM under-reports the cliff ledge by ~20 m (DEM 79 m vs. true 99 m). Without an override, the horizon check would still pass `clear` (the verdict only needs clearance > 5°), but the on-page "observer elevation" stat would read 80 m instead of the correct 100 m.

- [ ] **Step 1: Extend the constant**

Replace lines 41–43:

```js
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
}
```

With:

```js
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
  'haestahjallafoss-dynjandi': 99,
}
```

(The dict key must be the spot's `slug` as it appears in the live API.)

- [ ] **Step 2: Verify the constant parses**

Run: `node -e "import('./scripts/recompute-spot-horizons.mjs').catch(e => console.log('expected: failure at API fetch, not at constants. err:', String(e).split('\\n')[0]))"`

The script will eventually fail trying to fetch from the live API (because the new spot isn't there yet — that's Phase 2), but it must successfully load the file. If the error message mentions `KNOWN_ELEVATION` or a syntax error, the edit broke parsing — fix before continuing.

Expected line in output starts with something like `expected: failure at API fetch, not at constants. err: TypeError: fetch ...` or `... Error: API error ...`. Anything mentioning `SyntaxError`, `ReferenceError`, or `Unexpected token` means the edit is broken.

- [ ] **Step 3: Stage**

```bash
git add scripts/recompute-spot-horizons.mjs
```

---

### Task 5: Append Hæstahjallafoss link to the guide page

**Files:**
- Modify: `content/guide.md:39`

- [ ] **Step 1: Replace the Westfjords link list**

Line 39 currently reads:

```markdown
Top spots: [Látrabjarg Cliffs](/spots/latrabjarg-cliffs) · [Breiðavík Beach](/spots/breidavik-beach) · [Patreksfjörður Beach](/spots/patreksfjordur-beach) · [Ísafjörður Harbour](/spots/isafjordur-harbour)
```

Replace with:

```markdown
Top spots: [Látrabjarg Cliffs](/spots/latrabjarg-cliffs) · [Breiðavík Beach](/spots/breidavik-beach) · [Patreksfjörður Beach](/spots/patreksfjordur-beach) · [Ísafjörður Harbour](/spots/isafjordur-harbour) · [Hæstahjallafoss (Dynjandi)](/spots/haestahjallafoss-dynjandi)
```

- [ ] **Step 2: Verify**

Run: `grep -c "haestahjallafoss-dynjandi" content/guide.md`

Expected: `1`.

- [ ] **Step 3: Stage**

```bash
git add content/guide.md
```

---

### Task 6: Add advisories migration (3 entries)

**Files:**
- Create: `scripts/migrations/006-haestahjallafoss-advisories.sql`

The pattern mirrors `scripts/migrations/005-advisories-levels.sql` and the
existing advisory rows on other curated spots. Three entries: one `warn`
(cloud climatology) and two `info` (hike, cell). Severity ordering: `warn`
first so `useAdvisories().topLevel` resolves to it. The IS translation
generator's `warnings_titles` array (added in Task 7) must list these
three titles in the same order.

- [ ] **Step 1: Create the migration file with exact contents below**

```sql
-- Seed three advisories for haestahjallafoss-dynjandi:
--   warn — Westfjords cloud climatology
--   info — 20-min hike from parking
--   info — no cell coverage at fjord head
-- Severity ordering matters: warn first so useAdvisories().topLevel
-- resolves to it. The IS translation generator's warnings_titles array
-- must list these three titles in the same order.

UPDATE viewing_spots
SET warnings = '[
  {"level":"warn","title":"Cloudiest region for the eclipse","body":"Aug 12 climatology shows 8 of last 10 years overcast at totality (avg 82% cloud). Consider Snæfellsnes or Reykjanes as a clearer-sky alternative if forecasts trend poor in the final 72 hours."},
  {"level":"info","title":"20-minute walk from the parking","body":"Marked trail climbing past the waterfall cascades, ~670 m one way with ~95 m elevation gain. Stepped sections and uneven rocks — walking shoes essential, not flip-flops. Allow extra time if carrying tripod / heavy camera."},
  {"level":"info","title":"No cell coverage","body":"Arnarfjörður head has no mobile signal. Download offline tiles and the spot detail before leaving the main road. Closest reliable coverage is back along Route 60 toward the nearest village (~25–30 km)."}
]'::jsonb
WHERE slug = 'haestahjallafoss-dynjandi';
```

- [ ] **Step 2: Verify the JSON parses**

Run: `node -e "const fs=require('fs'); const sql=fs.readFileSync('scripts/migrations/006-haestahjallafoss-advisories.sql','utf8'); const m=sql.match(/\\[\\s*{[^]+}\\s*\\]/); JSON.parse(m[0]); console.log('JSON OK,', JSON.parse(m[0]).length, 'advisories');"`

Expected: `JSON OK, 3 advisories`. Anything else means the SQL JSON literal has an escaping bug — most likely a missing closing brace or a stray comma.

- [ ] **Step 3: Stage**

```bash
git add scripts/migrations/006-haestahjallafoss-advisories.sql
```

The maintainer applies this file in Supabase as part of the Phase 1 handoff (alongside the seed row and photo UPDATE).

---

### Task 7: Add Icelandic translation entry to the generator

**Files:**
- Modify: `scripts/internal/generate-spot-translations-is.mjs` (add to the `is` object — insert alphabetically near existing entries; the existing keys are slug-keyed)

The generator's `is` object is keyed by slug. Entries follow the pattern from `akranes-lighthouse` (lines 37–47): `name`, `description`, `parking_info`, `terrain_notes`, `warnings_titles` (an array — one entry per production warning, in production order, level pulled from the EN row).

- [ ] **Step 1: Add the new entry to the `is` object**

Insert this entry (alphabetical position: between `grotta-lighthouse-reykjavik` and `hellissandur-village`, or wherever fits the existing alphabetical scheme):

```js
'haestahjallafoss-dynjandi': {
  name: 'Hæstahjallafoss (Dynjandagönguleið)',
  description:
    'Einn af nafngreindu fossunum í fosshlíðinni við Dynjanda, hálfa leið upp klettavegginn í botni Arnarfjarðar. Stutt ganga frá bílastæðinu leiðir þig á litla syllu þar sem áin steypist fram hjá þér út í fjörðinn — beint í átt að sólinni á heilmyrkva. Fjörðurinn opnast til vest-norðvesturs út á opið haf og gefur skýran sjóndeildarhring þrátt fyrir suðurvegginn í kring. ~95 sekúndur af heilmyrkva.',
  parking_info:
    'Merkt Dynjandabílastæði við enda vegslóðans af Vegi 60. Möl, ~50 bílar, frítt. Kamar, engin önnur þjónusta. Gönguleiðin byrjar sunnan á planinu.',
  terrain_notes:
    'Þrepasett gönguleið liggur upp brekkuna meðfram fossunum, sneiðingar yfir grjót og steina. ~670 m, ~95 m hækkun, 20 mínútur aðra leið. Syllan við Hæstahjallafoss er grasi vaxin með lágum náttúrulegum klettavarnargarði — gott fótfesti en úti í vindi. Pláss fyrir einn til tvo ljósmyndara með þrífæti; hafðu félaga með ef þú myndar í myrkri eftir heilmyrkvann.',
  warnings_titles: [
    'Skýjaríkasta svæðið fyrir sólmyrkvann',
    '20-mínútna ganga frá bílastæðinu',
    'Ekkert farsímasamband',
  ],
},
```

- [ ] **Step 2: Verify the JS parses**

Run: `node -e "import('./scripts/internal/generate-spot-translations-is.mjs').catch(e => console.log('Note: generator may fail trying to read parsed-spots.json which won''t include the new spot yet. Err head:', String(e).split('\\n')[0]))"`

Expected: either successful import or an error about `parsed-spots.json` not containing `haestahjallafoss-dynjandi`. Anything mentioning `SyntaxError` or `Unexpected token` means the edit broke parsing — fix before continuing.

Do NOT regenerate the `.sql` file at this point. The generator reads from `raw-photos/parsed-spots.json` which is exported from production, and won't contain the new spot until Phase 2. The IS translation `.sql` is regenerated in Task 11 after the spot is in production.

- [ ] **Step 3: Stage**

```bash
git add scripts/internal/generate-spot-translations-is.mjs
```

---

### Task 8: Commit Phase 1 (a single coherent commit)

- [ ] **Step 1: Verify all expected files are staged**

Run: `git status --short`

Expected output (exact list, in any order):

```
M  content/guide.md
M  scripts/internal/generate-spot-translations-is.mjs
M  scripts/recompute-spot-horizons.mjs
M  scripts/seed-spot-photos.sql
M  scripts/seed-viewing-spots-v2.sql
A  scripts/migrations/006-haestahjallafoss-advisories.sql
R  public/images/spots/dynjandi-arnarfjordur-hero-thumb.webp -> public/images/spots/haestahjallafoss-dynjandi-hero-thumb.webp
R  public/images/spots/dynjandi-arnarfjordur-hero.webp -> public/images/spots/haestahjallafoss-dynjandi-hero.webp
```

If anything is missing or unexpected, stop and reconcile before committing.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(spots): add Hæstahjallafoss (Dynjandi trail) as Westfjords viewing spot

Supersedes the dropped dynjandi-arnarfjordur parking spot with a
higher, more photogenic upper-trail ledge. Slug haestahjallafoss-dynjandi.

Code-side changes (Phase 1):
- seed-viewing-spots-v2.sql: replace stale dynjandi row with hæsta row
  (95s totality from grid lookup, hike spot_type, ~670m / 20min trail,
  trailhead at Dynjandi parking)
- seed-spot-photos.sql: retarget existing Dynjandi photo row at the
  new slug with rewritten alt text
- public/images/spots: git mv hero + thumb to match new slug
- recompute-spot-horizons.mjs: KNOWN_ELEVATION['haestahjallafoss-dynjandi']
  = 99 to correct the 30m DEM under-report at the cliff ledge
- migrations/006-haestahjallafoss-advisories.sql: warn + 2× info
- content/guide.md: append spot to Westfjords link list
- generate-spot-translations-is.mjs: add IS entry (regen deferred to Phase 2)

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

Expected: a single line beginning with a fresh commit hash and the message `feat(spots): add Hæstahjallafoss (Dynjandi trail) as Westfjords viewing spot`. The pre-commit hook will run the vitest suite; if it fails, fix the failure and re-commit (do not amend or use `--no-verify`).

---

## Phase 1 handoff: maintainer applies SQL in Supabase

After Phase 1 commits and the next deploy lands:

1. Open Supabase SQL editor for the production project.
2. Run the new `INSERT … ON CONFLICT` block from `scripts/seed-viewing-spots-v2.sql` (the `'haestahjallafoss'` block edited in Task 1).
3. Run the new `UPDATE` from `scripts/seed-spot-photos.sql` (the line edited in Task 2).
4. Run `scripts/migrations/006-haestahjallafoss-advisories.sql` (the file created in Task 6) — single `UPDATE` populating the `warnings` JSONB.
5. Verify by visiting `https://eclipsechase.is/api/spots/haestahjallafoss-dynjandi` — should return a 200 with the new spot's full payload including 3 advisories (sans `horizon_check` and IS translation; those come in Phase 2).

Phase 2 cannot begin until all five checks pass.

---

## Phase 2 — post-deploy regeneration

### Task 9: Regenerate horizon checks and apply UPDATE in Supabase

**Files:**
- Generates: `scripts/output/seed-horizon-checks.sql` (gitignored output; review only)

- [ ] **Step 1: Run the recompute script against the live API**

```bash
node scripts/recompute-spot-horizons.mjs
```

Expected: the script lists 29 spots (was 28; +1 for the new spot). The line for `haestahjallafoss-dynjandi` should read approximately:

```
  clear     clearance=  8.1°  obs_elev= 100.7m  haestahjallafoss-dynjandi
```

If the verdict for `haestahjallafoss-dynjandi` is anything other than `clear`, or `obs_elev` is materially different from 100.7m, **stop and investigate** — the spec assumes clear-verdict copy.

- [ ] **Step 2: Apply the generated SQL in Supabase**

The script writes `scripts/output/seed-horizon-checks.sql`. Open it, locate the `UPDATE … WHERE slug = 'haestahjallafoss-dynjandi'` statement, copy and run it in the Supabase SQL editor. (You can also run the entire file — it's an idempotent `BEGIN … COMMIT` block that updates every spot's horizon_check; safe to re-run.)

- [ ] **Step 3: Verify in production**

Run: `curl -s https://eclipsechase.is/api/spots/haestahjallafoss-dynjandi | node -e "let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{const j=JSON.parse(s); const h=j.spot?.horizon_check; console.log('verdict:', h?.verdict, 'clearance:', h?.clearance_degrees);})"`

Expected: `verdict: clear clearance: 8.1` (or close to it).

---

### Task 10: Regenerate the 10-year cloud history

**Files:**
- Modify: `public/eclipse-data/historical-weather.json`

- [ ] **Step 1: Run the fetch script against the live API**

```bash
node scripts/fetch-historical-weather.mjs --api=https://eclipsechase.is
```

Expected: the script processes 29 spots, queries Open-Meteo for each (10 years × 29 spots = 290 calls, ~30 seconds at the script's 80 ms throttle). The final line for the new spot should be approximately:

```
  haestahjallafoss-dynjandi          ... clear 1/10 · avg 82% clouds
```

If `clear` is materially different from 1/10 or `avg` is materially different from 82%, the Open-Meteo numbers shifted since the spec — verify the script ran without errors and accept whatever the live API/ERA5 returns (this is reanalysis data, occasional jitter is normal).

- [ ] **Step 2: Stage and commit the JSON diff**

The script overwrites `public/eclipse-data/historical-weather.json`. The diff should be: one new `haestahjallafoss-dynjandi` entry, plus possibly tiny numerical drifts on existing entries from ERA5 re-pulls.

Run: `git diff --stat public/eclipse-data/historical-weather.json`

Expected: the JSON file changed; existing entries should diff in only a few lines (Open-Meteo numbers occasionally drift by 1–2 %).

```bash
git add public/eclipse-data/historical-weather.json
git commit -m "data(spots): add 10-year cloud history for haestahjallafoss-dynjandi"
```

---

### Task 11: Regenerate IS translation SQL and apply in Supabase

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

Expected: writes `raw-photos/parsed-spots.json` containing 29 spots, including `haestahjallafoss-dynjandi`.

- [ ] **Step 3: Regenerate the IS translations SQL**

```bash
node scripts/internal/generate-spot-translations-is.mjs
```

Expected: writes `scripts/seed-spot-translations-is.sql` with the new spot's translation entry near the existing entries (alphabetical or generator-determined order). Coverage line in the file header (~line 21) should now read "Coverage: 29 spots".

- [ ] **Step 4: Apply the IS UPDATE in Supabase**

In the Supabase SQL editor, locate the regenerated `WITH translations(spot_slug, locale, name, description, parking_info, terrain_notes, warnings) AS (VALUES …)` block and find the row for `'haestahjallafoss-dynjandi'`. Either run the entire script (idempotent `ON CONFLICT (spot_slug, locale) DO UPDATE`) or extract just the new row's INSERT into the `viewing_spot_translations` table.

- [ ] **Step 5: Verify**

Run: `curl -s "https://eclipsechase.is/api/spots/haestahjallafoss-dynjandi?locale=is" | node -e "let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{const j=JSON.parse(s); console.log('IS name:', j.spot?.name); console.log('IS desc start:', (j.spot?.description||'').slice(0, 80));})"`

Expected: `IS name: Hæstahjallafoss (Dynjandagönguleið)` and a description starting with `Einn af nafngreindu fossunum …`.

If the API doesn't accept a `?locale=` query param (verify against an existing translated spot like `akranes-lighthouse` first), check the actual locale-passing convention used by the rest of the app.

- [ ] **Step 6: Stage and commit the regenerated files**

```bash
git add raw-photos/parsed-spots.json scripts/seed-spot-translations-is.sql
git commit -m "data(spots): regenerate IS translations including haestahjallafoss-dynjandi"
```

---

## Final acceptance

The change is done when all of these pass:

- `GET https://eclipsechase.is/api/spots` returns 29 spots (was 28).
- `GET https://eclipsechase.is/api/spots/haestahjallafoss-dynjandi` returns the full payload including `horizon_check.verdict === 'clear'` and `clearance_degrees ≈ 8`.
- `public/eclipse-data/historical-weather.json` contains a `haestahjallafoss-dynjandi` entry.
- The spot detail page at `/spots/haestahjallafoss-dynjandi` renders: hero photo (Fjallfoss cascade), 3 advisories with warn-level topmost, trailhead pin on the location map, Icelandic translation when locale toggled to `is`.
- The Westfjords link list on `/guide` includes the Hæstahjallafoss link.

