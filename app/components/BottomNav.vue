<script setup lang="ts">
const route = useRoute()
const { isPro } = useProStatus()

const showNav = computed(() => isPro.value && route.path !== '/')

const items = [
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/recommend', label: 'For You', icon: 'recommend' },
  { to: '/spots', label: 'Spots', icon: 'spots' },
  { to: '/guide', label: 'Guide', icon: 'guide' },
] as const

function isActive(to: string) {
  if (to === '/spots') return route.path.startsWith('/spots')
  return route.path === to
}
</script>

<template>
  <!-- Scrim: full-width gradient fade at bottom -->
  <div v-if="showNav" class="bottom-nav-scrim" aria-hidden="true" />
  <!-- Spacer: pushes page content above the nav -->
  <div v-if="showNav" class="bottom-nav-spacer" aria-hidden="true" />
  <nav v-if="showNav" class="bottom-nav" aria-label="Main navigation">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item"
      :class="{ active: isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
    >
      <div class="bottom-nav-icon-wrap">
        <!-- Map icon -->
        <svg v-if="item.icon === 'map'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <!-- Recommend / For You icon -->
        <svg v-else-if="item.icon === 'recommend'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <!-- Spots icon -->
        <svg v-else-if="item.icon === 'spots'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <!-- Guide icon -->
        <svg v-else-if="item.icon === 'guide'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>
      <span class="bottom-nav-label">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  align-items: flex-end;
  z-index: 50;
  padding: 0 4px;
}

/* Full-width gradient scrim — fades content into void at bottom */
.bottom-nav-scrim {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 120px;
  background: linear-gradient(to bottom, transparent 0%, var(--void-deep) 65%);
  pointer-events: none;
  z-index: 49;
}

/* Spacer pushes page content above the nav so nothing is hidden */
.bottom-nav-spacer {
  height: 100px;
  width: 100%;
  flex-shrink: 0;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bottom-nav-item:hover {
  transform: translateY(-3px);
}

.bottom-nav-icon-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--void-surface);
  border: 1px solid rgba(26, 37, 64, 0.5);
  transition: all 0.3s ease;
  position: relative;
}

.bottom-nav-item.active .bottom-nav-icon-wrap {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.25);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.bottom-nav-item:hover .bottom-nav-icon-wrap {
  border-color: rgba(100, 116, 139, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.bottom-nav-icon-wrap svg {
  color: #475569;
  transition: all 0.3s ease;
}

.bottom-nav-item.active .bottom-nav-icon-wrap svg {
  color: var(--corona);
}

.bottom-nav-item:hover .bottom-nav-icon-wrap svg {
  color: #94a3b8;
}

.bottom-nav-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #334155;
  transition: color 0.3s ease;
}

.bottom-nav-item.active .bottom-nav-label {
  color: var(--corona-dim);
}

/* Safe area for pages that show bottom nav */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    bottom: calc(18px + env(safe-area-inset-bottom));
  }
}
</style>
