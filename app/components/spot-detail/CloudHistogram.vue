<script setup lang="ts">
defineProps<{
  /** Each entry corresponds to one Aug-12 historical year's cloud-cover %. */
  years: Array<{ year: number; cloud_cover: number }>
  height?: number
}>()

function band(c: number): 'good' | 'warn' | 'bad' {
  if (c < 40) return 'good'
  if (c < 70) return 'warn'
  return 'bad'
}
</script>

<template>
  <div class="histo">
    <div class="bars" :style="{ height: `${height ?? 90}px` }">
      <div
        v-for="y in years"
        :key="y.year"
        class="col"
      >
        <div
          class="bar"
          :data-band="band(y.cloud_cover)"
          :style="{ height: `${(y.cloud_cover / 100) * (height ?? 90)}px` }"
          :aria-label="`${y.year}: ${y.cloud_cover}% cloud`"
        />
        <div class="tick">'{{ String(y.year).slice(2) }}</div>
      </div>
    </div>
    <div class="legend">
      <span class="lg-good">● &lt;40% clear</span>
      <span class="lg-warn">● 40–70%</span>
      <span class="lg-bad">● &gt;70%</span>
    </div>
  </div>
</template>

<style scoped>
.histo { display: flex; flex-direction: column; gap: 14px; }
.bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  background: rgb(var(--chart-track) / 0.06);
  transition: background 0.2s;
}
.bar[data-band='good'] { background: rgb(var(--good)); }
.bar[data-band='warn'] { background: rgb(var(--warn)); }
.bar[data-band='bad']  { background: rgb(var(--bad)); }

.tick {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 8px;
  color: rgb(var(--ink-1) / 0.42);
}
.legend {
  display: flex;
  gap: 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
}
.lg-good { color: rgb(var(--good)); }
.lg-warn { color: rgb(var(--warn)); }
.lg-bad  { color: rgb(var(--bad)); }
</style>
