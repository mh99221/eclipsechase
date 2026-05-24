<script setup lang="ts">
/**
 * Two non-aggressive next-step cards under /check results. Uses the
 * shared Card primitive so spacing, radius and surface match the
 * rest of the site.
 */
import Card from '~/components/ui/Card.vue'

const { t } = useI18n()

defineProps<{
  insidePath: boolean
}>()
</script>

<template>
  <div class="cta-grid">
    <NuxtLinkLocale to="/spots" class="cta-link">
      <Card>
        <div class="cta-eyebrow">{{ t('check.cta_spots_eyebrow') }}</div>
        <div class="cta-title">{{ t('check.cta_spots_title') }}</div>
        <div class="cta-body">{{ t('check.cta_spots_body') }}</div>
        <div class="cta-arrow">→</div>
      </Card>
    </NuxtLinkLocale>
    <NuxtLinkLocale to="/pro" class="cta-link">
      <Card>
        <div class="cta-eyebrow">{{ t('check.cta_pro_eyebrow') }}</div>
        <div class="cta-title">{{ t('check.cta_pro_title') }}</div>
        <div class="cta-body">{{ t('check.cta_pro_body') }}</div>
        <div class="cta-arrow">→</div>
      </Card>
    </NuxtLinkLocale>
  </div>
</template>

<style scoped>
.cta-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
@media (min-width: 640px) {
  .cta-grid { grid-template-columns: 1fr 1fr; }
}
.cta-link {
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
}
.cta-link :deep(.ui-card) {
  position: relative;
  padding-right: 36px;
  transition: border-color 0.15s, background 0.15s;
}
.cta-link:hover :deep(.ui-card) {
  border-color: rgb(var(--accent) / 0.32);
  background: rgb(var(--surface) / 0.07);
}
.cta-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.2em;
  color: rgb(var(--accent));
  text-transform: uppercase;
  margin-bottom: 6px;
}
.cta-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-bottom: 4px;
}
.cta-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12.5px;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.45;
}
.cta-arrow {
  position: absolute;
  top: 14px;
  right: 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  color: rgb(var(--ink-1) / 0.42);
  transition: color 0.15s, transform 0.15s;
}
.cta-link:hover .cta-arrow {
  color: rgb(var(--accent));
  transform: translateX(2px);
}
</style>
