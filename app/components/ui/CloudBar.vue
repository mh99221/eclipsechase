<script setup lang="ts">
const props = defineProps<{
  cloud: number          // 0–100
  segments?: number      // default 12
}>()

const total = computed(() => props.segments ?? 12)
const filled = computed(() => Math.max(0, Math.min(total.value, Math.round((props.cloud / 100) * total.value))))

function band(i: number): 'good' | 'warn' | 'bad' {
  // segment-i out of total — color reflects what % range that slot represents
  const pct = ((i + 1) / total.value)
  if (pct < 0.5) return 'good'
  if (pct < 0.7) return 'warn'
  return 'bad'
}
</script>

<template>
  <div class="cloud-bar" :aria-label="`${cloud}% cloud cover`" role="img">
    <span
      v-for="i in total"
      :key="i"
      class="seg"
      :data-on="i <= filled"
      :data-band="band(i - 1)"
    />
  </div>
</template>

<style scoped>
.cloud-bar { display: flex; gap: 2px; flex: 1; }
.seg {
  flex: 1;
  height: 4px;
  border-radius: 1px;
  background: rgb(var(--chart-track) / 0.06);
}
.seg[data-on='true'][data-band='good'] { background: rgb(var(--good)); }
.seg[data-on='true'][data-band='warn'] { background: rgb(var(--warn)); }
.seg[data-on='true'][data-band='bad']  { background: rgb(var(--bad)); }
</style>
