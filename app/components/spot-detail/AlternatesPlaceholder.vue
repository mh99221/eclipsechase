<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import CardTitle from '~/components/ui/CardTitle.vue'
</script>

<template>
  <!--
    Plan-B alternates aren't a column in viewing_spots today; v0 spec calls for
    a list of nearby spots ranked by drive time + Δ totality. Render a stub
    until that feature ships.
    TODO(v0-spec): compute alternates by haversine + drive-time API.
  -->
  <Card>
    <CardTitle>{{ $t('v0.spot_detail.card_plan_b') }}</CardTitle>
    <p class="placeholder">{{ $t('v0.spot_detail.plan_placeholder') }}</p>
  </Card>
</template>

<style scoped>
.placeholder {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.5;
  margin: 0;
}
</style>
