<script setup lang="ts">
import StatusDot from '~/components/ui/StatusDot.vue'
import CloudBar from '~/components/ui/CloudBar.vue'
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
}>()

const status = computed(() => cloudToStatus(props.cloud))
const cloudPct = computed(() => props.cloud ?? 0)
const heroSrc = computed(() => props.heroFilename ? `/images/spots/${props.heroFilename}` : null)
const heroSrcset = computed(() => {
  if (!props.heroFilename) return undefined
  const thumb = props.heroFilename.replace(/\.webp$/, '-thumb.webp')
  return `/images/spots/${thumb} 600w, /images/spots/${props.heroFilename} 1200w`
})
</script>

<template>
  <NuxtLink :to="`/spots/${slug}`" class="spot-card" :aria-label="`${name} — ${formatDuration(durationSeconds)} totality`">
    <img
      v-if="heroSrc"
      :src="heroSrc"
      :srcset="heroSrcset"
      sizes="(max-width: 767px) 100vw, 768px"
      :alt="heroAlt || name"
      class="spot-card-img"
      loading="lazy"
      width="600"
      height="160"
    />
    <div v-else class="spot-card-fallback" aria-hidden="true" />
    <div class="spot-card-veil" aria-hidden="true" />

    <div class="spot-card-region-badge">{{ regionLabel(region).toUpperCase() }}</div>
    <div class="spot-card-cloud-badge">
      <StatusDot :status="status" :size="7" />
      <span v-if="cloud != null">{{ cloud }}% cloud</span>
      <span v-else>— cloud</span>
    </div>

    <div class="spot-card-bottom">
      <div class="spot-card-name">{{ name }}</div>
      <div class="spot-card-bottom-row">
        <div class="spot-card-dur">{{ formatDuration(durationSeconds) }}</div>
        <div class="spot-card-bar"><CloudBar :cloud="cloudPct" :segments="12" /></div>
      </div>
    </div>
  </NuxtLink>
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
.spot-card-region-badge,
.spot-card-cloud-badge {
  position: absolute;
  top: 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgb(var(--glass-chip) / 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  letter-spacing: 0.1em;
  z-index: 1;
}
.spot-card-region-badge {
  left: 14px;
  font-size: 9.5px;
}
.spot-card-cloud-badge {
  right: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
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
  align-items: center;
  justify-content: space-between;
}
.spot-card-dur {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  color: rgb(var(--totality));
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.spot-card-bar {
  flex: 1;
  margin-left: 14px;
}
</style>
