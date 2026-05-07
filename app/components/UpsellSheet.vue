<script setup lang="ts">
const { t } = useI18n()
const { isOpen, closeUpsell } = useUpsell()

function onBackdropClick() {
  closeUpsell()
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) closeUpsell()
}

if (import.meta.client) {
  watch(isOpen, (open) => {
    if (open) {
      window.addEventListener('keydown', onEsc)
    } else {
      window.removeEventListener('keydown', onEsc)
    }
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="upsell-fade">
      <div
        v-if="isOpen"
        data-testid="upsell-sheet"
        class="upsell-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="t('v0.upsell.title')"
        @click.self="onBackdropClick"
      >
        <div class="upsell-card">
          <button
            class="upsell-close"
            type="button"
            :aria-label="t('v0.upsell.dismiss')"
            @click="closeUpsell"
          >×</button>

          <h2 class="upsell-title">{{ t('v0.upsell.title') }}</h2>

          <ul class="upsell-bullets">
            <li data-testid="upsell-bullet">{{ t('v0.upsell.bullet_weather') }}</li>
            <li data-testid="upsell-bullet">{{ t('v0.upsell.bullet_spots') }}</li>
            <li data-testid="upsell-bullet">{{ t('v0.upsell.bullet_roads') }}</li>
          </ul>

          <p class="upsell-price-note">{{ t('v0.upsell.price_note') }}</p>

          <div class="upsell-actions">
            <NuxtLink
              data-testid="upsell-cta-primary"
              to="/pro"
              class="upsell-cta-primary"
              @click="closeUpsell"
            >
              {{ t('v0.upsell.cta_primary') }}
            </NuxtLink>
            <NuxtLink
              data-testid="upsell-cta-secondary"
              to="/pro#restore"
              class="upsell-cta-secondary"
              @click="closeUpsell"
            >
              {{ t('v0.upsell.cta_secondary') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.upsell-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgb(0 0 0 / 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
@media (min-width: 768px) {
  .upsell-backdrop {
    align-items: center;
    padding: 24px;
  }
}

.upsell-card {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: rgb(var(--bg-elevated));
  border: 1px solid rgb(var(--border-subtle) / 0.12);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: 28px 22px max(28px, env(safe-area-inset-bottom));
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.45);
}
@media (min-width: 768px) {
  .upsell-card {
    border-radius: 16px;
    padding: 32px 28px;
    box-shadow: 0 12px 48px rgb(0 0 0 / 0.5);
  }
}

.upsell-close {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgb(var(--ink-3));
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.upsell-close:hover { color: rgb(var(--ink-1)); }

.upsell-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0 0 16px;
  padding-right: 32px;
}

.upsell-bullets {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.upsell-bullets li {
  font-size: 14px;
  line-height: 1.45;
  color: rgb(var(--ink-2));
  padding-left: 18px;
  position: relative;
}
.upsell-bullets li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--accent));
}

.upsell-price-note {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgb(var(--ink-3));
  margin: 0 0 20px;
  text-transform: uppercase;
}

.upsell-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upsell-cta-primary {
  display: block;
  text-align: center;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 14px 16px;
  border-radius: 8px;
  text-decoration: none;
}
.upsell-cta-primary:hover { background: rgb(var(--accent-strong)); }

.upsell-cta-secondary {
  display: block;
  text-align: center;
  background: transparent;
  color: rgb(var(--ink-2));
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  text-decoration: none;
}
.upsell-cta-secondary:hover { color: rgb(var(--ink-1)); }

.upsell-fade-enter-active,
.upsell-fade-leave-active { transition: opacity 0.18s ease; }
.upsell-fade-enter-from,
.upsell-fade-leave-to { opacity: 0; }
</style>
