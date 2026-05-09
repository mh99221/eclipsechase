<script setup lang="ts">
import { cloudToStatus } from '~/utils/v0'
import { formatDuration, regionLabel } from '~/utils/eclipse'

const props = defineProps<{
  slug: string
  name: string
  region: string
  durationSeconds: number
  cloud: number | null
  heroFilename: string | null
  heroAlt?: string
  /** Above-the-fold cards: paint immediately, hint the loader. The first
   *  ~4 cards on /spots set this; everything below stays lazy. */
  eager?: boolean
}>()

const { t } = useI18n()

const status = computed(() => cloudToStatus(props.cloud))
const cloudLabel = computed(() => props.cloud == null
  ? t('v0.spots.card_cloud_missing')
  : t('v0.spots.card_cloud_pct', { pct: props.cloud }))
const heroSrc = computed(() => props.heroFilename ? `/images/spots/${props.heroFilename}` : null)
const heroSrcset = computed(() => {
  if (!props.heroFilename) return undefined
  const thumb = props.heroFilename.replace(/\.webp$/, '-thumb.webp')
  return `/images/spots/${thumb} 600w, /images/spots/${props.heroFilename} 1200w`
})
</script>

<template>
  <NuxtLinkLocale :to="`/spots/${slug}`" class="spot-card" :aria-label="t('v0.spots.card_aria', { name, duration: formatDuration(durationSeconds), cloud: cloudLabel })">
    <!-- Always paint a fallback gradient first so the card never shows
         page bg through the border while the hero image is loading. The
         <img> above stacks on top once decoded; if heroSrc is missing,
         the gradient is the entire surface. -->
    <div class="spot-card-fallback" aria-hidden="true" />
    <img
      v-if="heroSrc"
      :src="heroSrc"
      :srcset="heroSrcset"
      sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, 360px"
      :alt="heroAlt || name"
      class="spot-card-img"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
      width="600"
      height="160"
    />
    <div class="spot-card-veil" aria-hidden="true" />

    <div class="spot-card-region-badge">{{ regionLabel(region).toUpperCase() }}</div>

    <div class="spot-card-bottom">
      <div class="spot-card-name">{{ name }}</div>
      <div class="spot-card-bottom-row">
        <div class="spot-card-stat">
          <div class="spot-card-stat-l">{{ t('v0.spots.card_stat_totality') }}</div>
          <div class="spot-card-dur">{{ formatDuration(durationSeconds) }}</div>
        </div>
        <div class="spot-card-stat spot-card-stat--right">
          <div class="spot-card-stat-l">{{ t('v0.spots.card_stat_history') }}</div>
          <div class="spot-card-cloud" :data-status="status">{{ cloudLabel }}</div>
        </div>
      </div>
    </div>
  </NuxtLinkLocale>
</template>

<style scoped>
.spot-card {
  position: relative;
  display: block;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  text-decoration: none;
  color: inherit;
  isolation: isolate;
}
.spot-card-img,
.spot-card-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.spot-card-fallback {
  background: linear-gradient(180deg, #1A2030 0%, #382828 100%);
}
.spot-card-veil {
  position: absolute;
  inset: 0;
  /* Photo veil — dark in both themes; sits on the photo, not page bg. */
  background: linear-gradient(180deg, transparent 30%, rgb(var(--glass-strong) / 0.92) 100%);
}
.spot-card-region-badge {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgb(var(--glass-chip) / 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  letter-spacing: 0.1em;
  font-size: 9.5px;
  z-index: 1;
}
.spot-card-bottom {
  position: absolute;
  bottom: 12px;
  left: 14px;
  right: 14px;
  z-index: 1;
}
.spot-card-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}
.spot-card-bottom-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}
.spot-card-stat { min-width: 0; }
.spot-card-stat--right { text-align: right; }
.spot-card-stat-l {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: rgb(255 255 255 / 0.55);
  text-transform: uppercase;
  margin-bottom: 2px;
  white-space: nowrap;
}
.spot-card-dur {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  /* Hard-coded dark-theme values regardless of theme — these readouts
     sit on the dark photo veil (glass-strong, intentionally dark in
     both themes), so the deep light-theme palette would wash out.
     Keeping the vibrant dark-theme colours here is the same approach
     used for the glass-* tokens. */
  color: #8F8C61;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.spot-card-cloud {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.spot-card-cloud[data-status='good']     { color: #78D888; }
.spot-card-cloud[data-status='marginal'] { color: #E5C04A; }
.spot-card-cloud[data-status='bad']      { color: #D85848; }
</style>
