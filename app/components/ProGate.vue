<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  feature?: string
}>()

const { isPro, loading } = useProStatus()
</script>

<template>
  <slot v-if="isPro" />
  <div v-else-if="loading" class="animate-pulse bg-surface-raised rounded h-32" />
  <div v-else class="bg-surface-raised border border-border-subtle/40 rounded px-6 py-8 text-center">
    <p class="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase mb-3">
      {{ t('pro.unlock') }}
    </p>
    <p class="font-display text-lg font-semibold text-ink-1 mb-2">
      This feature requires Eclipse Pro
    </p>
    <p class="text-sm text-ink-3 mb-6">
      One-time payment. Works offline. No account needed.
    </p>
    <div class="max-w-xs mx-auto">
      <ProUpgradeButton />
    </div>
  </div>
</template>
