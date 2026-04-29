<script setup lang="ts">
import type { ForecastPhase } from '~/composables/useForecastPhase'

defineProps<{ phase: ForecastPhase }>()

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.upgrade_title') }}</CardTitle>
    <p class="upgrade-body">{{ t(`v0.forecast.upgrade_body_${phase}`) }}</p>
    <ProUpgradeButton :label="t('v0.forecast.upgrade_cta')" />
  </Card>
</template>

<style scoped>
.upgrade-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.78);
  margin: 0 0 14px;
}
</style>
