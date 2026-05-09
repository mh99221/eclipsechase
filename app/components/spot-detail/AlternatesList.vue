<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import CardTitle from '~/components/ui/CardTitle.vue'
import { formatDuration } from '~/utils/eclipse'

interface SpotLite {
  slug: string
  name: string
  lat: number
  lng: number
  totality_duration_seconds: number | null
}

const props = defineProps<{
  /** The current spot — excluded from alternates and used as the origin. */
  current: SpotLite
  /** Full spots list to filter against. */
  spots: SpotLite[] | null
  /** Max straight-line distance in km. ~30km ≈ ~30min drive on Iceland's
   *  rural roads. Tunable per region but a single global cap works for
   *  the curated dataset. */
  maxDistanceKm?: number
  /** Cap rendered alternates so the card stays scannable. */
  limit?: number
}>()

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Rough straight-line km → drive-minute estimate. Iceland's rural Route 1
 * cruising speed is ~80–90 km/h on the flats and far less on gravel /
 * fjord roads, so we average to ~60 km/h. Multiply km by 1 for minutes.
 * The card label shows "~Nm" so the imprecision reads as approximate.
 */
function kmToDriveMin(km: number): number {
  return Math.round(km)
}

interface Alternate {
  slug: string
  name: string
  km: number
  driveMin: number
  durSec: number
  delta: number  // seconds difference vs current totality
}

const alternates = computed<Alternate[]>(() => {
  if (!props.spots) return []
  const cap = props.maxDistanceKm ?? 30
  const limit = props.limit ?? 5
  const currentDur = props.current.totality_duration_seconds ?? 0

  const within: Alternate[] = []
  for (const s of props.spots) {
    if (s.slug === props.current.slug) continue
    const km = haversineKm(props.current.lat, props.current.lng, s.lat, s.lng)
    if (km > cap) continue
    const dur = s.totality_duration_seconds ?? 0
    within.push({
      slug: s.slug,
      name: s.name,
      km,
      driveMin: kmToDriveMin(km),
      durSec: dur,
      delta: dur - currentDur,
    })
  }
  // Closest first; tie-break by longer totality
  within.sort((a, b) => a.km - b.km || b.durSec - a.durSec)
  return within.slice(0, limit)
})

function formatDelta(deltaSec: number): string {
  if (deltaSec === 0) return '±0s'
  const abs = Math.abs(deltaSec)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  const mag = m > 0 ? `${m}m ${s}s` : `${s}s`
  return deltaSec > 0 ? `+${mag}` : `−${mag}`
}
</script>

<template>
  <Card>
    <CardTitle>{{ $t('v0.spot_detail.card_plan_b') }}</CardTitle>
    <div v-if="alternates.length === 0" class="empty">
      No nearby alternates within {{ maxDistanceKm ?? 30 }}&nbsp;km. Check the Map tab for the wider list.
    </div>
    <div v-else class="alt-list">
      <NuxtLinkLocale
        v-for="a in alternates"
        :key="a.slug"
        :to="`/spots/${a.slug}`"
        class="alt-row"
      >
        <div class="alt-l">
          <div class="alt-name">{{ a.name }}</div>
          <div class="alt-meta">~{{ a.driveMin }}m drive · {{ a.km.toFixed(1) }} km</div>
        </div>
        <div class="alt-dur">{{ formatDuration(a.durSec) }}</div>
        <div
          class="alt-delta"
          :data-tone="a.delta > 0 ? 'good' : a.delta < 0 ? 'bad' : 'flat'"
        >{{ formatDelta(a.delta) }}</div>
      </NuxtLinkLocale>
    </div>
  </Card>
</template>

<style scoped>
.empty {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.5;
  margin: 0;
}
.alt-list { display: flex; flex-direction: column; }
.alt-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px 0;
  text-decoration: none;
  color: inherit;
}
.alt-row + .alt-row { border-top: 1px solid rgb(var(--border-subtle) / 0.08); }
.alt-row:hover .alt-name { color: rgb(var(--accent)); }
.alt-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  color: rgb(var(--ink-1));
  font-weight: 500;
  transition: color 0.15s;
}
.alt-meta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--ink-1) / 0.62);
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.alt-dur {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  color: rgb(var(--totality));
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.alt-delta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 44px;
  text-align: center;
}
.alt-delta[data-tone='good'] {
  color: rgb(var(--good));
  background: rgb(var(--good) / 0.12);
}
.alt-delta[data-tone='bad'] {
  color: rgb(var(--bad));
  background: rgb(var(--bad) / 0.12);
}
.alt-delta[data-tone='flat'] {
  color: rgb(var(--ink-1) / 0.62);
  background: rgb(var(--chart-track) / 0.06);
}
</style>
