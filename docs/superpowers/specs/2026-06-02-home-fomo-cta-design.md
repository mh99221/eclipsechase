# Home page — urgency + CTA pass (FOMO via real scarcity)

**Date:** 2026-06-02
**Scope:** `app/pages/index.vue` + `i18n/en.json` (`v0.home.*` namespace)
**Goal:** Make the landing page convert harder without breaking its
credibility-first voice. Urgency rides on the *true* rarity fact (the next
total eclipse over Iceland is in 2196 — 170 years away) plus "increase your
chances" action framing. No manufactured scarcity, no countdown-pressure
banners, no blinking/repeated CTAs.

## Decisions (from brainstorming)

- **Tone:** Fact-driven urgency. Scarcity is real, so it reinforces the
  data-led brand rather than fighting it.
- **Placement:** All four — hero CTA + rarity line, sharpened subhead,
  a dedicated "unique opportunity" band, and a strengthened Pro CTA block.

## Changes

### 1. Hero CTA + rarity microline
The hero currently ends countdown → tagline with no action button.

- Add a **rarity microline** under the countdown (small mono, `--ink-3`):
  > The next total solar eclipse over Iceland isn't until 2196.
- Add a **primary CTA** (`.btn-corona`, reused) below the tagline:
  > Find your viewing spot → `/spots`

New keys: `v0.home.hero_rarity`, `v0.home.hero_cta`.

### 2. Sharpen the subhead
Append an agency close to the existing factual subhead:
> "…so you know before you go — and can pick the spot that gives you the
> best shot at totality."

Edit existing key `v0.home.subhead`.

### 3. "Unique opportunity" band
New `<section>` after the dashboard preview, before the Free-vs-Pro offer.
Reuses the existing band visual language (eyebrow / h2 / body) plus a CTA.
Visible to everyone (rarity applies to Pro users too).

- Eyebrow: `ONCE IN 170 YEARS`
- Title: "You get one shot at this."
- Body: "On August 12, 2026 the Moon's shadow crosses western Iceland for
  just over two minutes — then it's gone for 170 years. Clouds and terrain
  decide who actually sees it. **Increase your chances:** check the horizon
  and cloud history before you commit to a spot."
- CTA: "Find your spot →" → `/spots`

New keys: `v0.home.opportunity_eyebrow`, `_title`, `_body`, `_cta`.
("Increase your chances" rendered as a `<strong>` via `<i18n-t>` or inline
markup — body split so the emphasis is a slot, matching the existing
`trust_strip` pattern.)

### 4. Strengthen the Pro CTA block (non-Pro only)
Add one urgency/odds line inside the existing `.compare-cta` surface, above
the price:
> "Don't leave your one shot to chance — Pro's live scoring, horizon checks,
> and road cams help you move to clearer skies on the day."

New key: `v0.home.pro_compare_urgency`. Price, "no subscription", and restore
link unchanged.

## i18n

All keys live under `v0.home.*`. Per project convention Icelandic
(`is.json`) lazy-falls-back to English for the `v0.*` namespace, so only
`en.json` needs the new/edited strings.

## Out of scope

- No changes to the Pro-status (already-purchased) variant beyond what
  existing `v-if` gating already does.
- No new components — additions are inline section markup + scoped CSS that
  reuses existing `.home-section` / `.home-eyebrow` / `.home-h2` /
  `.btn-corona` styling.

## Verification

- `npm run dev`, load `/`, confirm: hero button + rarity line render;
  subhead reads correctly; opportunity band appears in the right order;
  Pro urgency line shows for non-Pro and the section stays hidden for Pro.
- Check light + dark themes (semantic tokens only — no hardcoded palette).
- Lint/typecheck pass.
