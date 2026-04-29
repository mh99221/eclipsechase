<script setup lang="ts">
/**
 * Phase stub for the extended-deterministic window (T-15 → T-7).
 * Open-Meteo IFS HRES forecast lights up here per spec §3.2 — needs the
 * paid subscription. This stub bridges the gap.
 */
const { t } = useI18n()
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.extended_title') }}</CardTitle>
    <p class="stub-body">{{ t('v0.forecast.extended_stub') }}</p>
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
