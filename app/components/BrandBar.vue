<script setup lang="ts">
const route = useRoute()
const isLanding = computed(() => route.path === '/')
const isMap = computed(() => route.path === '/map')
</script>

<template>
  <header class="brand-bar">
    <!-- On /map the inner row spans the full viewport width so chrome lines up
         with the edge-to-edge map below. Other pages use the standard reading
         column. Preserves the legacy app.vue branching. -->
    <div :class="['brand-bar-inner', isMap ? 'is-map' : 'is-content']">
      <NuxtLink to="/" aria-label="EclipseChase — Home" class="brand-mark">
        <svg class="brand-mark-logo" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="36" fill="#070A12" />
          <circle cx="64" cy="64" r="36" stroke="rgb(var(--accent))" stroke-width="3" opacity="0.85" />
          <circle cx="96" cy="48" r="4" fill="rgb(var(--accent))" />
        </svg>
        <span class="brand-mark-wordmark">ECLIPSECHASE</span>
      </NuxtLink>

      <div class="brand-bar-right">
        <span v-if="isLanding" class="brand-bar-coords">
          <span class="hide-sm">64.1°N 21.9°W · </span>AUG 12 2026
        </span>
        <ClientOnly v-else><UserMenu /></ClientOnly>
      </div>
    </div>
  </header>
</template>

<style scoped>
.brand-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
.brand-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 14px) 16px 14px;
  min-height: 60px;
  gap: 14px;
}
.brand-bar-inner.is-content {
  max-width: 768px;
  margin: 0 auto;
}
.brand-bar-inner.is-map {
  width: 100%;
}
.brand-mark {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  min-height: 44px;
}
.brand-mark-logo {
  width: 22px;
  height: 22px;
}
.brand-mark-wordmark {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.21em;
  color: rgb(var(--ink-1));
}
.brand-bar-coords {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgb(var(--ink-1) / 0.62);
}
.brand-bar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
}
@media (max-width: 480px) {
  .hide-sm { display: none; }
}
</style>
