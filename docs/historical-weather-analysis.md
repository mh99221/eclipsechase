# Historical Weather Analysis — Eclipse 2026

Cloud-cover climatology for the total solar eclipse on **Aug 12, 2026** at
**17:45 UTC** (totality), based on 10 years of Open-Meteo / ERA5 reanalysis
data (2016–2025).

Two separate artefacts:

1. **Curated-spot histories** — `public/eclipse-data/historical-weather.json`,
   built by `scripts/fetch-historical-weather.mjs`. One record per spot in
   the DB, surfaced in the UI (spot detail chart, listing chip, map popup).

2. **Totality-path sweep** — `scripts/output/discovered-clear-spots.json`,
   built by `scripts/discover-clear-spots.mjs`. Samples every land point
   inside the totality polygon at ~5km spacing to answer: _are there any
   undiscovered spots that beat our curated best?_ Answer below.

---

## Method

For each candidate location:

1. Request `cloud_cover` for Aug 12 from Open-Meteo's ERA5 archive
   (`https://archive-api.open-meteo.com/v1/archive`).
2. Extract the 17:00 and 18:00 UTC values.
3. Linear-interpolate at 17:45 (the middle of Iceland's totality window).
4. Classify into bands:
   - **Clear**  — `< 40%` cloud cover
   - **Partly** — `40–70%`
   - **Overcast** — `> 70%`
5. Repeat for 2016 through 2025 → `clear_years / total_years`.

Grid discovery additionally:
- Generates candidates at `0.045° lat × 0.1° lng` (~5km) inside the
  totality polygon.
- Filters to land only (DEM elevation `> 10m`, using
  `server/data/dem/west-iceland-30m.bin`).
- File-backed cache so rate-limited runs can resume.

Accuracy notes:
- ERA5 resolution is **~9km** — microclimates smaller than that are
  invisible. A valley vs. a peak at the same lat/lng will read identical.
- Past 10 years is a rough prior. Climate shifts and individual-year
  weather variance dominate the actual eclipse-day outcome.

---

## Totality-path sweep — summary

Scope: 414 land points across the totality polygon in western Iceland.

### Tier distribution

| Clear years | Points | Share |
|-------------|-------:|------:|
| 4/10        | 2      | 0.5%  |
| 3/10        | 39     | 9.4%  |
| 2/10        | 119    | 28.8% |
| 1/10        | 171    | 41.4% |
| 0/10        | 82     | 19.9% |

**No location in the totality path exceeds 4/10.** Iceland in August is
systematically cloudy — the historical ceiling is ~40% clear odds.

### The two 4/10 candidates

Both in Reykjanes:

| Lat     | Lng     | Elev | Likely area                                        |
|---------|---------|------|-----------------------------------------------------|
| 63.9900 | -22.6000 | 50m  | Miðnesheiði plain, south of Keflavík airport        |
| 64.0350 | -22.6000 | 19m  | Near Njarðvík / east of Keflavík, off Reykjanesbraut |

These sit ~5–10km from the existing **Gardur Lighthouse** and **Sandgerdi
Shore** curated spots (both 4/10) and likely share an ERA5 cell. They're
not a new discovery so much as confirmation that Reykjanes is the historical
best zone.

### 3/10 clusters worth noting

Three geographically distinct zones:

1. **South Reykjanes plain** (63.9°N, -22.7 to -22.4°W). Already covered by
   the existing Reykjanes lighthouses.
2. **North Snæfellsnes / Breiðafjörður coast** (~65.43°N, -23.7°W). Near
   Stykkishólmur; existing Stykkishólmur Harbour Hill captures this.
3. **South Snæfellsnes inland** (~64.94°N, -23.0°W). Berserkjahraun /
   Helgafell area. Not currently in the curated list — mild candidate for
   a future addition if completionism matters.

---

## Curated-spot results

Ranked from the output of `scripts/fetch-historical-weather.mjs`
(generated 2026-04 run):

| Spot                              | Clear years | Avg cloud | Region       |
|-----------------------------------|------------:|----------:|--------------|
| Gardur Lighthouse                 | 4/10        | 59%       | Reykjanes    |
| Sandgerdi Shore                   | 4/10        | 59%       | Reykjanes    |
| Reykjanesta Lighthouse            | 3/10        | 73%       | Reykjanes    |
| Blue Lagoon                       | 3/10        | 73%       | Reykjanes    |
| Keflavik-Ásbru Viewpoint          | 3/10        | 69%       | Reykjanes    |
| Stykkishólmur Harbour Hill        | 3/10        | 72%       | Snæfellsnes  |
| Snæfellsjökull Summit             | 2/10        | 72%       | Snæfellsnes  |
| Saxhóll Crater                    | 2/10        | 72%       | Snæfellsnes  |
| Löndrangar · Malarrif             | 2/10        | 72%       | Snæfellsnes  |
| Akranes Lighthouse                | 2/10        | 78%       | Borgarfjörður |
| Perlan / Sky Lagoon (Reykjavík)   | 1/10        | 78%       | Reykjavík    |
| Kirkjufell Viewpoint              | 1/10        | 79%       | Snæfellsnes  |
| Ísafjörður Harbour                | 1/10        | 81%       | Westfjords   |
| Látrabjarg Cliffs                 | 0/10        | 94%       | Westfjords   |
| Breiðavík Beach                   | 0/10        | 94%       | Westfjords   |
| Patreksfjörður Beach              | 0/10        | 91%       | Westfjords   |

### Regional takeaways

- **Reykjanes peninsula wins historically.** Gardur + Sandgerdi at 4/10,
  five more spots at 3/10.
- **Snæfellsnes is the second choice.** Most sites 1–2/10. Stykkishólmur
  specifically is the best Snæfellsnes pick at 3/10.
- **Westfjords is historically the worst.** Latrabjarg and friends at
  0/10 — not a single year clear in a decade.
- **Reykjavík city spots are poor** (1/10) — urban climate + too far
  from the cleaner Reykjanes air.

---

## Interpretation — what this means for trip planning

1. **Climatology isn't destiny.** A 4/10 spot still has a 60% chance of
   being cloudy on any given Aug 12. Don't treat historical odds as
   a forecast.
2. **Reykjanes is the statistically safe bet.** If you must commit to a
   region months in advance (fly, book hotels), Reykjanes gives the best
   base rate.
3. **Mobility is the highest-value asset.** The day-of forecast delta
   between regions can be huge (one region clear, another socked in).
   A rental car + flexibility beats any "best spot" pick.
4. **Don't fly to the Westfjords for the eclipse alone.** The scenery is
   spectacular but 0/10 historical odds are hard to ignore. Go there for
   the drive; plan the eclipse viewing somewhere else.

---

## Re-running the analysis

To refresh the curated-spot data (do this yearly, ~Q1):

```bash
node scripts/fetch-historical-weather.mjs
git add public/eclipse-data/historical-weather.json
git commit -m "chore: refresh historical weather data"
```

To re-run the totality-path sweep with a different threshold:

```bash
# Default: search for 5+ clear years (finds nothing in W Iceland)
node scripts/discover-clear-spots.mjs

# Lower the bar
node scripts/discover-clear-spots.mjs --min-clear=3

# Finer grid (more API calls, slower)
node scripts/discover-clear-spots.mjs --step=0.03

# Different min-elevation filter
node scripts/discover-clear-spots.mjs --min-elev=100   # mountains only
```

The sweep is rate-limited by Open-Meteo's free tier. If a run ends with
`FAIL (will retry next run)` lines, just re-run — the file-backed cache
in `scripts/output/discovery-cache.json` will skip already-fetched
points.

---

## Data sources and caveats

- **Open-Meteo Archive API** — free, no API key, backed by **ERA5 reanalysis**
  (ECMWF). Same dataset professional meteorologists use.
- **ÍslandsDEM v1.0** — 30m-resolution elevation model for the land filter.
- **Totality polygon** — precomputed in `public/eclipse-data/path.geojson`
  from `scripts/compute-eclipse-grid.py` (Skyfield).

Limitations:
- ERA5 doesn't model Iceland's microclimate differences between a sheltered
  fjord and an exposed coast 2km away.
- 10 years is a moderate sample. Confidence intervals on "4/10 clear" are
  wide — a single bad year swings the count visibly.
- Cloud cover % doesn't distinguish a thin high cirrus layer (fine for
  totality) from thick low stratus (ruinous). Real eclipse viewing cares
  more about the latter.

For August 2026 eclipse-day planning, treat this as a prior. The live
forecast (via `/api/weather/cloud-cover`, the on-map cloud layer) is the
authoritative signal closer to the event.
