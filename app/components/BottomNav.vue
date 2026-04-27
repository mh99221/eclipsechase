<script setup lang="ts">
const route = useRoute()
const { isPro } = useProStatus()
const { items, isActive } = useNavItems()

const showNav = computed(() => isPro.value && route.path !== '/')
</script>

<template>
  <nav v-if="showNav" class="bottom-nav" aria-label="Main navigation">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item"
      :class="{ active: isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
    >
      <!-- Home — eclipse motif (circle outline + dot) -->
      <svg v-if="item.icon === 'home'" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="10" cy="10" r="6" />
        <circle cx="14.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
      <!-- Spots — pin -->
      <svg v-else-if="item.icon === 'spots'" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 1c-3 0-5 2-5 5 0 4 5 9 5 9s5-5 5-9c0-3-2-5-5-5z" />
        <circle cx="10" cy="6.5" r="1.6" />
      </svg>
      <!-- Map — globe / world -->
      <svg v-else-if="item.icon === 'map'" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="2 5 2 18 7 15 13 18 18 15 18 2 13 5 7 2 2 5" />
        <line x1="7" y1="2" x2="7" y2="15" />
        <line x1="13" y1="5" x2="13" y2="18" />
      </svg>
      <!-- Guide — open book -->
      <svg v-else-if="item.icon === 'guide'" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h5a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H2z" />
        <path d="M18 3h-5a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h6z" />
      </svg>
      <span class="bottom-nav-label">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  z-index: 30;
}
@media (min-width: 768px) {
  .bottom-nav { display: none; }
}
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    height: calc(72px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  min-height: 44px;
  text-decoration: none;
  color: rgb(var(--ink-1) / 0.62);
  transition: color 0.2s ease;
}
.bottom-nav-item svg { color: inherit; }
.bottom-nav-item:hover {
  color: rgb(var(--ink-1));
}
.bottom-nav-item.active {
  color: rgb(var(--accent));
}
.bottom-nav-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: inherit;
}
</style>
