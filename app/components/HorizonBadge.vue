<script setup lang="ts">
import type { HorizonVerdict } from '~/types/horizon'

const props = defineProps<{
  verdict: HorizonVerdict
  clearance: number
  compact?: boolean
}>()

const { t } = useI18n()

const config: Record<HorizonVerdict, { color: string; bg: string; border: string }> = {
  clear: { color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  marginal: { color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  risky: { color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  blocked: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30' },
}

const style = computed(() => config[props.verdict])

const label = computed(() => t(`horizon.label_${props.verdict}`))

const description = computed(() =>
  t(`horizon.verdict_${props.verdict}`, { clearance: Math.abs(props.clearance).toFixed(1) }),
)
</script>

<template>
  <!-- Compact mode: colored dot + label -->
  <span v-if="compact" class="inline-flex items-center gap-1.5 font-mono text-xs">
    <span
      class="w-2 h-2 rounded-full flex-shrink-0"
      :style="{ backgroundColor: style.color }"
    />
    <span :style="{ color: style.color }">{{ label }}</span>
  </span>

  <!-- Full mode: badge with description -->
  <div
    v-else
    class="inline-flex items-start gap-2 px-3 py-2 rounded border text-sm"
    :class="[style.bg, style.border]"
  >
    <span
      class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
      :style="{ backgroundColor: style.color }"
    />
    <span :style="{ color: style.color }">{{ description }}</span>
  </div>
</template>
