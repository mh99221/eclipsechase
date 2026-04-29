<script setup lang="ts">
/**
 * Phase stub for the subseasonal window (T-30 → T-15). Real implementation
 * needs the Open-Meteo paid subscription that starts July 1 (eclipsechase
 * -weather-forecast-spec.md §3.2). Until then, this card explains when
 * the data lights up so Pro users hitting the Weather tab in late June
 * see "what's coming" rather than a missing card.
 */
const { t } = useI18n()
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.subseasonal_title') }}</CardTitle>
    <p class="stub-body">{{ t('v0.forecast.subseasonal_stub') }}</p>
  </Card>
</template>

<style scoped>
.stub-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.62);
  margin: 0;
}
</style>
