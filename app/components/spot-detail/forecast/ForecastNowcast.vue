<script setup lang="ts">
/**
 * Phase stub for the day-of nowcast (T-1 → T-0). Real implementation
 * wires up the EUMETSAT Meteosat live cloud-position link plus a 5-min
 * refresh cadence on vedur observations (spec §3.4 + §6). Wired up
 * Aug 11 in a separate commit.
 */
const { t } = useI18n()
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.nowcast_title') }}</CardTitle>
    <p class="stub-body">{{ t('v0.forecast.nowcast_stub') }}</p>
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
