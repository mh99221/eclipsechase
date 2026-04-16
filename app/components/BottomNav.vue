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
      :class="[
        { active: isActive(item.to) },
        item.icon === 'home' ? 'bottom-nav-home' : ''
      ]"
      :aria-current="isActive(item.to) ? 'page' : undefined"
    >
      <!-- Map icon -->
      <svg v-if="item.icon === 'map'" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
      <!-- Home icon — eclipse motif -->
      <svg v-else-if="item.icon === 'home'" class="home-eclipse" width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.15" />
        <circle cx="18" cy="8" r="1.5" fill="currentColor" />
      </svg>
      <!-- Spots icon -->
      <svg v-else-if="item.icon === 'spots'" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <!-- Guide icon -->
      <svg v-else-if="item.icon === 'guide'" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(5, 8, 16, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(26, 37, 64, 0.4);
  z-index: 50;
}

/* Desktop (md+): hide bottom nav — top masthead takes over */
@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}

/* Safe area for notched phones */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    height: calc(76px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  text-decoration: none;
  padding: 8px 0;
  flex: 1;
  transition: transform 0.2s ease;
  position: relative;
}

.bottom-nav-item svg {
  color: #94a3b8; /* slate-400 — matches desktop masthead inactive */
  transition: all 0.25s ease;
}

.bottom-nav-item.active svg {
  color: var(--corona);
}

.bottom-nav-item:hover svg {
  color: #cbd5e1; /* slate-300 */
}

.bottom-nav-item.active:hover svg {
  color: var(--corona-bright);
}

.bottom-nav-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8; /* slate-400 — matches icon */
  transition: color 0.25s;
}

.bottom-nav-item:hover .bottom-nav-label {
  color: #cbd5e1;
}

.bottom-nav-item.active .bottom-nav-label {
  color: var(--corona-dim);
}

/* Active indicator dot */
.bottom-nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 2px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--corona);
}

/* Home eclipse icon — slightly larger */
.bottom-nav-home .home-eclipse {
  transition: all 0.3s ease;
}

.bottom-nav-home.active .home-eclipse {
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.3));
}
</style>
