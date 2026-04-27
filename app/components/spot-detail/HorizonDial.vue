<script setup lang="ts">
import { azimuthCompass } from '~/utils/v0'

const props = defineProps<{
  altitude: number
  azimuth: number
  size?: number
}>()

const size = computed(() => props.size ?? 200)

// Place the sun on a half-dome looking south. azimuth: 0=N, 90=E, 180=S, 270=W.
// Project to dome x by the relative offset from south, then lift by altitude.
const dial = computed(() => {
  const s = size.value
  const cx = s / 2
  const cy = s - 16
  const r = s / 2 - 8
  const altRad = (props.altitude / 90) * (Math.PI / 2)
  const azOffset = props.azimuth - 180  // -180..+180; WSW (~248°) → +68
  const sx = cx + Math.sin((azOffset / 180) * (Math.PI / 2)) * r
  const sy = cy - Math.sin(altRad) * r * 0.9
  return { cx, cy, r, sx, sy }
})

const ringRadii = [15, 30, 45, 60, 75]
function ringRY(altDeg: number): number {
  return dial.value.r * Math.cos((altDeg / 90) * (Math.PI / 2))
}
function ringYOffset(altDeg: number): number {
  return -dial.value.r * Math.sin((altDeg / 90) * (Math.PI / 2))
}
</script>

<template>
  <div class="dial-wrap">
    <svg :viewBox="`0 0 ${size} ${size}`" class="dial" :width="size" :height="size" role="img" aria-label="Sun position dial">
      <!-- Dome arc -->
      <path
        :d="`M ${dial.cx - dial.r} ${dial.cy} A ${dial.r} ${dial.r} 0 0 1 ${dial.cx + dial.r} ${dial.cy}`"
        fill="none"
        :stroke="'rgb(var(--border-subtle) / 0.16)'"
        stroke-width="1"
      />
      <!-- Altitude ring projections -->
      <ellipse
        v-for="a in ringRadii"
        :key="a"
        :cx="dial.cx"
        :cy="dial.cy + ringYOffset(a)"
        :rx="ringRY(a)"
        :ry="ringRY(a) * 0.18"
        fill="none"
        :stroke="'rgb(var(--border-subtle) / 0.12)'"
        stroke-width="0.6"
      />
      <!-- Horizon line -->
      <line
        :x1="dial.cx - dial.r"
        :y1="dial.cy"
        :x2="dial.cx + dial.r"
        :y2="dial.cy"
        :stroke="'rgb(var(--border-subtle) / 0.16)'"
        stroke-width="1"
      />
      <!-- Compass labels -->
      <text :x="dial.cx - dial.r - 2" :y="dial.cy + 14" class="dial-tick" text-anchor="end">E</text>
      <text :x="dial.cx + dial.r + 2" :y="dial.cy + 14" class="dial-tick">W</text>
      <text :x="dial.cx" :y="dial.cy + 14" class="dial-tick" text-anchor="middle">S</text>
      <!-- Sun -->
      <circle :cx="dial.sx" :cy="dial.sy" r="22" :fill="'rgb(var(--accent) / 0.06)'" />
      <circle :cx="dial.sx" :cy="dial.sy" r="14" :fill="'rgb(var(--accent) / 0.18)'" />
      <circle :cx="dial.sx" :cy="dial.sy" r="8"  :fill="'rgb(var(--accent))'" />
      <text :x="dial.sx + 14" :y="dial.sy + 4" class="dial-readout">{{ altitude.toFixed(1) }}°</text>
    </svg>

    <div class="readout">
      <div>
        <div class="r-lbl">ALT</div>
        <div class="r-val">{{ altitude.toFixed(1) }}°</div>
      </div>
      <div>
        <div class="r-lbl">AZ</div>
        <div class="r-val">{{ Math.round(azimuth) }}°</div>
      </div>
      <div>
        <div class="r-lbl">DIR</div>
        <div class="r-val">{{ azimuthCompass(azimuth) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dial-wrap { display: flex; flex-direction: column; gap: 14px; }
.dial { width: 100%; max-width: 200px; display: block; margin: 0 auto; }
.dial-tick {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  fill: rgb(var(--ink-1) / 0.62);
}
.dial-readout {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  fill: rgb(var(--ink-1));
}
.readout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 12px 0 0;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
}
.r-lbl {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.13em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
}
.r-val {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
</style>
