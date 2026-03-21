<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  feature?: string
}>()

const { isPro, loading } = useProStatus()
</script>

<template>
  <slot v-if="isPro" />
  <div v-else-if="loading" class="animate-pulse bg-void-surface rounded h-32" />
  <div v-else class="bg-void-surface border border-void-border/40 rounded px-6 py-8 text-center">
    <p class="font-mono text-xs tracking-[0.2em] text-slate-500 uppercase mb-3">
      {{ t('pro.unlock') }}
    </p>
    <p class="font-display text-lg font-semibold text-white mb-2">
      This feature requires Eclipse Pro
    </p>
    <p class="text-sm text-slate-400 mb-6">
      One-time payment. Works offline. No account needed.
    </p>
    <div class="max-w-xs mx-auto">
      <ProUpgradeButton />
    </div>
  </div>
</template>
