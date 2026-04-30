<script setup lang="ts">
defineProps<{
  eyebrow: string
  /** Status colour for the dot — uses --good / --warn / --bad / --accent. */
  dotVar?: 'good' | 'warn' | 'bad' | 'accent'
  meta?: string
}>()
</script>

<template>
  <div class="hd">
    <span class="hd-eyebrow">
      <span v-if="dotVar" class="hd-dot" :data-dot="dotVar" />
      {{ eyebrow }}
    </span>
    <span v-if="meta" class="hd-meta">{{ meta }}</span>
  </div>
</template>

<style scoped>
.hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}
.hd-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: rgb(var(--accent));
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.hd-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--accent));
}
.hd-dot[data-dot='good'] { background: rgb(var(--good)); }
.hd-dot[data-dot='warn'] { background: rgb(var(--warn)); }
.hd-dot[data-dot='bad']  { background: rgb(var(--bad)); }
.hd-meta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
