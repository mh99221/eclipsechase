<script setup lang="ts">
import type { HorizonVerdict } from '~/types/horizon'
import { HORIZON_VERDICT_STYLES } from '~/utils/eclipse'

const props = defineProps<{
  verdict: HorizonVerdict
  clearance: number
  compact?: boolean
}>()

const { t } = useI18n()

const style = computed(() => HORIZON_VERDICT_STYLES[props.verdict]!)

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
