<script setup lang="ts">
// Interactive teaser for the profile-based recommendation engine that
// lives (gated) on /map and /spots. Static by design: it never touches
// live weather or the real scorer — the three spots and their per-profile
// orderings are hand-encoded from useRecommendation.ts weights so the
// landing stays SSR-safe, can't go stale, and doesn't leak Pro scoring.
// The default (firsttimer) order renders server-side, so no-JS visitors
// and crawlers still get a valid ranked list; tapping is progressive
// enhancement.
const { t } = useI18n()

type ProfileId = 'firsttimer' | 'photographer' | 'skychaser' | 'hiker' | 'family'
type SpotSlug = 'kirkjufell' | 'gardur' | 'sandafell'

const PROFILES: ProfileId[] = ['firsttimer', 'photographer', 'skychaser', 'hiker', 'family']

interface SpotInfo {
  href: string
  thumb: string
  nameKey: string
  regionKey: string
  typeKey: string
  totality: string
}

// totality strings are the exact per-spot durations from viewing_spots
// (Kirkjufell 114s, Garður 104s, Sandafell 110s) — facts true for Aug 12,
// not live data, so they can't contradict the live map.
const SPOTS: Record<SpotSlug, SpotInfo> = {
  kirkjufell: {
    href: '/spots/kirkjufell-viewpoint',
    thumb: '/images/spots/kirkjufell-viewpoint-hero-thumb.webp',
    nameKey: 'v0.home.persona_spot_kirkjufell_name',
    regionKey: 'v0.home.persona_spot_kirkjufell_region',
    typeKey: 'v0.home.persona_type_shortwalk',
    totality: '1m 54s',
  },
  gardur: {
    href: '/spots/gardur-lighthouse',
    thumb: '/images/spots/gardur-lighthouse-hero-thumb.webp',
    nameKey: 'v0.home.persona_spot_gardur_name',
    regionKey: 'v0.home.persona_spot_gardur_region',
    typeKey: 'v0.home.persona_type_driveup',
    totality: '1m 44s',
  },
  sandafell: {
    href: '/spots/sandafell-thingeyri',
    thumb: '/images/spots/sandafell-thingeyri-hero-thumb.webp',
    nameKey: 'v0.home.persona_spot_sandafell_name',
    regionKey: 'v0.home.persona_spot_sandafell_region',
    typeKey: 'v0.home.persona_type_hike',
    totality: '1m 50s',
  },
}

// Per-profile result, mirroring the real engine:
//  - order: ranked, surviving spots (top → bottom)
//  - filtered: spots a profile's hard floor strikes out, with the reason
// Garður is a drive-up (Hiker strikes it); Sandafell has no services
// (Family strikes it); Kirkjufell survives every profile.
interface Ranking {
  order: SpotSlug[]
  filtered: Partial<Record<SpotSlug, string>>
}
const RANKINGS: Record<ProfileId, Ranking> = {
  firsttimer: { order: ['gardur', 'kirkjufell', 'sandafell'], filtered: {} },
  photographer: { order: ['kirkjufell', 'sandafell', 'gardur'], filtered: {} },
  skychaser: { order: ['gardur', 'kirkjufell', 'sandafell'], filtered: {} },
  hiker: { order: ['sandafell', 'kirkjufell'], filtered: { gardur: 'v0.home.persona_filter_driveup' } },
  family: { order: ['gardur', 'kirkjufell'], filtered: { sandafell: 'v0.home.persona_filter_services' } },
}

const active = ref<ProfileId>('firsttimer')

interface DisplayCard extends SpotInfo {
  slug: SpotSlug
  rank: number | null
  filtered: boolean
  reasonKey: string | null
}

const cards = computed<DisplayCard[]>(() => {
  const r = RANKINGS[active.value]
  const ranked: DisplayCard[] = r.order.map((slug, i) => ({
    slug, ...SPOTS[slug], rank: i + 1, filtered: false, reasonKey: null,
  }))
  const struck: DisplayCard[] = (Object.keys(r.filtered) as SpotSlug[]).map(slug => ({
    slug, ...SPOTS[slug], rank: null, filtered: true, reasonKey: r.filtered[slug] ?? null,
  }))
  return [...ranked, ...struck]
})
</script>

<template>
  <div class="persona">
    <!-- Profile chip strip — single-select, mirrors MapChipStack styling. -->
    <div
      class="persona-chips"
      role="group"
      :aria-label="t('v0.home.persona_eyebrow')"
    >
      <button
        v-for="p in PROFILES"
        :key="p"
        type="button"
        class="persona-chip"
        :class="{ 'persona-chip-active': active === p }"
        :aria-pressed="active === p"
        :data-testid="`persona-chip-${p}`"
        @click="active = p"
      >
        {{ t(`v0.home.persona_profile_${p}`) }}
      </button>
    </div>

    <!-- The engine's one-liner for the active profile. -->
    <p class="persona-blurb">{{ t(`v0.home.persona_blurb_${active}`) }}</p>

    <!-- Ranked cards. TransitionGroup FLIP-animates the reorder so the
         shuffle is legible; keyed by slug so each card keeps identity. -->
    <TransitionGroup
      tag="div"
      name="persona-rank"
      class="persona-grid"
      :aria-label="t('v0.home.persona_title')"
    >
      <NuxtLinkLocale
        v-for="card in cards"
        :key="card.slug"
        :to="card.href"
        class="persona-card"
        :class="{ 'persona-card-filtered': card.filtered }"
        :data-testid="`persona-card-${card.slug}`"
        :tabindex="card.filtered ? -1 : undefined"
        :aria-disabled="card.filtered ? 'true' : undefined"
      >
        <div class="persona-photo">
          <img
            :src="card.thumb"
            :alt="`${t(card.nameKey)} — ${t(card.regionKey)}`"
            loading="lazy"
            width="600"
            height="400"
          >
          <span
            v-if="card.filtered"
            class="persona-rank-badge persona-rank-badge-filtered"
          >{{ t('v0.home.persona_rank_filtered') }}</span>
          <span
            v-else
            class="persona-rank-badge"
          >#{{ card.rank }}</span>
        </div>
        <div class="persona-text">
          <h3 class="persona-name">{{ t(card.nameKey) }}</h3>
          <p class="persona-meta">
            <span>{{ t(card.regionKey) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ t(card.typeKey) }}</span>
          </p>
          <p
            v-if="card.filtered"
            class="persona-reason"
          >{{ card.reasonKey ? t(card.reasonKey) : '' }}</p>
          <p
            v-else
            class="persona-totality"
          >{{ card.totality }}</p>
        </div>
      </NuxtLinkLocale>
    </TransitionGroup>

    <!-- aria-live so screen readers hear the re-rank. -->
    <p class="sr-only" aria-live="polite">
      {{ t('v0.home.persona_live_announce', { profile: t(`v0.home.persona_profile_${active}`) }) }}
    </p>

    <div class="persona-footer">
      <NuxtLinkLocale to="/spots" class="btn-corona persona-cta">
        {{ t('v0.home.persona_cta') }}
      </NuxtLinkLocale>
      <p class="persona-note">{{ t('v0.home.persona_note') }}</p>
    </div>
  </div>
</template>

<style scoped>
.persona {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Chip strip — horizontal scroll on mobile, wraps on tablet+ ── */
.persona-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.persona-chips::-webkit-scrollbar { display: none; }
@media (min-width: 640px) {
  .persona-chips { flex-wrap: wrap; overflow-x: visible; }
}
.persona-chip {
  flex: 0 0 auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 13px;
  border-radius: 999px;
  border: 1px solid rgb(var(--border-subtle) / 0.2);
  background: rgb(var(--surface) / 0.04);
  color: rgb(var(--ink-2));
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.persona-chip:hover {
  border-color: rgb(var(--border-subtle) / 0.4);
  color: rgb(var(--ink-1));
}
.persona-chip-active {
  border-color: rgb(var(--accent) / 0.6);
  background: rgb(var(--accent) / 0.12);
  color: rgb(var(--accent));
}

.persona-blurb {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: rgb(var(--ink-2));
  margin: 0;
  min-height: 21px;
}

/* ── Card grid — mirrors .tricky-grid / .dashboard-card chrome. ── */
.persona-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 2px;
}
@media (min-width: 640px) {
  .persona-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
}
@media (min-width: 768px) {
  .persona-grid { gap: 18px; }
}
.persona-card {
  display: flex;
  flex-direction: column;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: rgb(var(--ink-1));
  transition: border-color 0.2s ease, background 0.2s ease;
}
a.persona-card:hover {
  border-color: rgb(var(--border-subtle) / 0.2);
  background: rgb(var(--surface) / 0.08);
}
.persona-card-filtered {
  cursor: default;
  pointer-events: none;
}
.persona-card-filtered .persona-photo img {
  filter: grayscale(1);
  opacity: 0.4;
}
.persona-card-filtered .persona-name,
.persona-card-filtered .persona-meta {
  color: rgb(var(--ink-3));
}

.persona-photo {
  position: relative;
  aspect-ratio: 3 / 2;
  background: rgb(var(--surface-raised) / 0.4);
  overflow: hidden;
}
.persona-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: filter 0.3s ease, opacity 0.3s ease;
}
.persona-rank-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: 3px;
  background: rgb(var(--accent) / 0.16);
  border: 1px solid rgb(var(--accent) / 0.5);
  color: rgb(var(--accent));
  backdrop-filter: blur(4px);
}
.persona-rank-badge-filtered {
  background: rgb(var(--bad) / 0.16);
  border-color: rgb(var(--bad) / 0.5);
  color: rgb(var(--bad));
}
.persona-text {
  padding: 13px 15px 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.persona-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
}
.persona-meta {
  display: flex;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--ink-3));
  margin: 0;
}
.persona-totality {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink-2));
  margin: 2px 0 0;
}
.persona-reason {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgb(var(--bad));
  margin: 2px 0 0;
}

/* ── Footer ── */
/* CTA + note centered under the ranked grid. */
.persona-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.persona-note {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1.5;
  color: rgb(var(--ink-3));
  margin: 0;
}

/* ── FLIP reorder animation ── */
.persona-rank-move {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .persona-rank-move { transition: none; }
  .persona-photo img { transition: none; }
}
</style>
