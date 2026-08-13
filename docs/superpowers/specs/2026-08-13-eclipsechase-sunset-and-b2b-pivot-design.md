# EclipseChase.is — Sunset & B2B Pivot

**Date:** 2026-08-13
**Status:** Approved design, pending implementation plan
**Context:** The August 12, 2026 total solar eclipse occurred yesterday. The
product has served its purpose and must be retired.

---

## 1. Background

EclipseChase.is shipped a complete Pro-gated PWA for the Aug 12, 2026 Iceland
eclipse: live weather, eclipse geometry, DEM-derived horizon checks, a
five-profile recommendation engine, Stripe payments, JWT auth, and offline
support.

**Commercial outcome: 7 Pro purchases.**

Purchase timestamps (UTC): Aug 2 22:30, Aug 8 04:47, Aug 10 17:33,
Aug 11 03:58, Aug 11 19:31, Aug 12 13:07, Aug 12 14:49.

Two facts follow from this data and drive every decision below.

**Six of seven purchases landed in the final five days**, two on eclipse day
itself. This is a normal event-conversion curve — the buying window was roughly
seven days wide. Low sales therefore indicate a narrow funnel, not a defective
product.

**The email signup list was small.** Combined with the above, the diagnosis is
unambiguous: EclipseChase was build-first, distribute-never. The constraint was
audience, not engineering.

**Refunds are not warranted.** Totality occurred ~17:43–17:48 UTC on Aug 12; the
latest purchase preceded it by nearly three hours. All seven buyers received the
product while it was useful. `terms.vue` carries an explicit Art. 16(m) EU
withdrawal waiver, so there is no statutory obligation either.

---

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Sunset cleanly; do not rebrand into a multi-eclipse platform | The `.is` TLD fights any non-Iceland product; a clean ending is honest to 2026 buyers |
| D2 | Keep content routes, retire Pro routes | `/guide` and spot pages retain durable search value; a live `/map` with dead data is what actually reads as abandoned |
| D3 | No refunds | All purchases preceded totality; waiver is in force |
| D4 | No farewell emails | User decision. Farewell page reaches returning visitors only |
| D5 | Do not build a 2027 consumer product | Est. €1–6k return against ~150–250 hours does not clear the opportunity cost of consulting hours |
| D6 | Pursue B2B: sell the platform to operators and destinations | Ticket size €8–15k; the 2026 build is the demo asset |
| D7 | Sell first, build second | Directly inverts the 2026 failure mode |

### 2.1 Why not a 2027 consumer product

The most technically impressive 2026 work does not transfer:

- **Horizon engine is obsolete.** Iceland's sun sat at ~24° during totality,
  making ridgelines decisive. On Aug 2, 2027 the sun is roughly 45–50° up in
  southern Spain and ~80° at Luxor. Nothing terrestrial obstructs it. The DEM
  pipeline, 91-point azimuth sweep, and 22 MB `horizon-grid.json` have no job.
- **Weather engine loses its value where the crowds go.** August climatology for
  Upper Egypt and the Libyan desert is effectively cloudless. Cloud forecasting
  only stays relevant in southern Spain, where Mediterranean marine-layer stratus
  is a genuine August risk.
- **Data sources vanish.** vedur.is and Vegagerðin are Iceland-only, with no
  multi-country equivalent. Open-Meteo would replace them — a simplification, but
  it means rewriting the ingest layer.
- **Half the path is non-viable.** Libya, Sudan, Yemen, and Somalia are unsuitable
  for a tourism product; Algeria is visa-hostile. Realistic targets reduce to
  Spain, Morocco, Egypt, and Saudi Arabia — and Arabic introduces RTL layout, an
  engineering cost never yet paid.

Roughly 60–70% of the build does transfer — Pro auth, Stripe, PageShell chrome,
`ui/` primitives, spot-detail architecture, `useForecastPhase`, the recommendation
scoring shape, offline/SW, i18n, OG generation, sitemap. This is the reusable
chassis referenced in §5.

### 2.2 Why the paywall was the wrong primitive

An eclipse trip is a €500–2,000 purchase. Standard affiliate rates — Booking.com
~4–6%, car rental ~7–8%, GetYourGuide ~8% — make a single accommodation booking
worth €25–100 in commission, i.e. 3–10× the entire €9.99 Pro price, from a user
who pays nothing.

Separately, €9.99 one-time cannot fund paid acquisition: travel-niche CPC of
roughly €0.30–1.00 against a generous 1.5% conversion implies €20–65 cost per
sale. Any consumer version of this product is locked into organic-only growth
permanently.

These figures are order-of-magnitude estimates, not forecasts. They are recorded
because they explain D5 and D6, not because they are precise.

---

## 3. Part 1 — Sunset

Executed in the order given. §3.1 must precede §3.2; §3.3 depends on §3.1.

### 3.1 Capture before teardown

Snapshot from Supabase into static JSON committed to the repository:

- Actual Aug 12, 2026 weather observations and forecasts, per station
- Final `viewing_spots` data for all 30 spots, including computed eclipse geometry
- Photo metadata and attribution (feeds `/credits`)

`content/guide.md` is already file-based and needs no capture.

This snapshot is the input to §3.3 and §3.6, and is unique content no other site
holds: what the sky actually did over Iceland on eclipse day.

### 3.2 Stop payments and scheduled jobs

- `server/api/stripe/checkout.post.ts` → return 410 Gone
- Deactivate the price in the Stripe dashboard, so a stale client cannot revive
  checkout
- Disable `.github/workflows/ingest-weather.yml`
- Remove the `crons` block from `vercel.json`
- Retire `/api/traffic/*` and `/api/cameras` alongside `/map`

Stopping the vedur.is polling also ends consumption of a free public service —
worth doing promptly as a courtesy.

**Priority:** a live checkout selling €9.99 access to an expired product is the
one item here with real exposure. It ships first, same day.

### 3.3 Remove the runtime database dependency

`/spots` and `/spots/[slug]` currently read Supabase per request. Supabase pauses
free-tier projects after sustained inactivity, so the likely failure mode is the
archive quietly 500-ing months from now — precisely when it is being used as a
sales demo (§5).

Convert both routes to build-time static data sourced from the §3.1 snapshot, and
prerender them. Result: pure static CDN output, no runtime database, no pause
risk, no database cost.

This is the largest single work item in Part 1. It is technically optional, but
without it the archive's lifespan is not under your control.

### 3.4 Retire the Pro surfaces

Note: `app/pages/` contains no `me.vue`; CLAUDE.md is stale on this point. The
actual Pro surfaces are listed below.

| Route | Action |
|---|---|
| `/map`, `/dashboard`, `/check` | 410 Gone — gated, so no search equity to lose |
| `/pro`, `/pro/success` | 301 → `/farewell` |
| `/`, `/guide`, `/spots`, `/spots/[slug]`, `/credits`, `/privacy`, `/terms` | Keep, prerendered |

Also required:

- Remove retired routes from `server/api/__sitemap__/urls.ts`
- Remove retired entries from `useNavItems()` / `BottomNav`
- Remove `pro-gate` middleware from retired routes

### 3.5 Retire the service worker

Ship a final `public/sw.js` that purges its caches and unregisters itself.

Without this, anyone who installed the PWA retains a dead app shell on their home
screen indefinitely, serving cached gated pages that no longer resolve. This is
the most commonly missed step in PWA shutdowns and the most visible when missed.

### 3.6 Freeze the live-data UI

Introduce an `EVENT_PASSED` flag driving:

- Countdown components → "This eclipse has passed"
- Forecast and weather panels → actual Aug 12, 2026 conditions from §3.1
- A sitewide archive banner stating the site is retained as a record

### 3.7 Farewell page

New `/farewell` route:

- Thanks to visitors and buyers
- What happened on Aug 12, 2026
- Next Iceland totality: **2196**
- Next global total eclipse: Aug 2, 2027 (Spain, Morocco, Egypt)

**No emails are sent** (D4). The page reaches returning visitors only; the seven
buyers and the signup list receive no notification. Accepted consequence: the
list goes cold and is not a viable launch asset later.

### 3.8 Data minimisation

- Purge `restore_codes` entirely — all rows are expired by construction
- Reduce `pro_purchases` to what accounting genuinely requires; Stripe retains the
  authoritative transaction record independently
- Retain `email_signups` only on a basis consistent with the existing
  `privacy.vue` text — reconcile against that page before acting

### 3.9 Retained infrastructure

Keep the domain (ISNIC renewal) and Vercel free-tier hosting. Post-§3.3 the site
is static, so ongoing cost is the domain alone. Mapbox usage on `SpotLocationMap`
remains within free tier at archive traffic levels.

---

## 4. Part 2 — B2B pivot

### 4.1 Governing rule

**Sell first, build second.** No 2027 code is written until a deal is signed. The
reusable chassis (§2.1) is documented now and extracted only when paid for.

### 4.2 Assets

- The archived site itself, as a live demo
- A one-page case study — production PWA, offline-first, payments, DEM
  geoprocessing, i18n, SEO, real users — which doubles as Elite Consulting
  collateral independent of any eclipse deal

### 4.3 Targets

**Tier 1 — realistic, weeks-long decision cycles.** Eclipse tour operators
(TravelQuest, Astro Trails, Wilderness Travel, and a long tail of smaller
outfits), Nile cruise operators, boutique hotel groups on the 2027 path. They
sell €3,000–10,000 trips, own the customer relationship, and treat €5–15k as a
normal marketing line.

**Tier 2 — speculative, one or two approaches only.** Turismo Costa del Sol,
Cádiz province, Tarifa, Gibraltar, Morocco ONMT, Egyptian Tourism Authority.
Ticket €15–40k, but government procurement is slow, relationship-driven, and
language-gated. Luxor's 6m23s makes Egypt the global headline destination for
2027, which is why it is listed at all despite poor odds.

### 4.4 Commercials

€8–15k build, plus optional €2–4k event-period support and hosting.

### 4.5 Calendar and kill switch

| Window | Activity |
|---|---|
| Sept–Dec 2026 | Outreach, while 2027 destination budgets are being set |
| By Feb 28, 2027 | **Go/no-go.** No signed deal → pivot stops |
| Mar–Jun 2027 | Build, only if funded |
| Jul 2027 | Live, ahead of the Aug 2 eclipse |

Cost of failure is ~20–30 hours of outreach, versus the ~200 hours a speculative
consumer rebuild would have consumed.

### 4.6 Expected outcome

Cold B2B outreach converts in the low single digits per approach. A pipeline of
30–50 contacts is the realistic shape of one or two wins, and **zero is a
plausible outcome**. The pivot is justified by asymmetry, not confidence: failure
costs weeks, while a single €10k deal exceeds every consumer scenario considered
combined.

---

## 5. Out of scope

- Any 2027 consumer product (D5)
- Extraction of the reusable chassis into a template repository — deferred until
  a deal is signed (D6, §4.1)
- Rebranding or domain migration (D1)
- Refunds or goodwill payments (D3)
- Farewell emails (D4)

---

## 6. Success criteria

**Part 1 is complete when:**

1. Stripe checkout returns 410 and the price is deactivated
2. No scheduled job calls vedur.is or Vegagerðin
3. `/spots` and `/spots/[slug]` render with Supabase unreachable
4. Retired routes return 410 or 301 as specified in §3.4
5. A previously installed PWA no longer serves cached gated pages
6. No page displays a live countdown, live forecast, or purchase CTA
7. `restore_codes` is empty and `pro_purchases` is minimised

**Part 2 is complete when** either a deal is signed, or Feb 28, 2027 passes
without one and the pivot is formally stopped.
