<script setup lang="ts">
// PWA install promotion.
//
// Two variants:
//   - hero:   large block, shown on /pro/success (no dismiss — one-time
//             post-purchase moment where offline access is the hook).
//   - banner: compact dismissible banner, shown on /dashboard for
//             returning Pro users who haven't installed yet. Dismissal
//             is persisted per-variant so closing it on the dashboard
//             doesn't suppress the hero copy elsewhere.
//
// Detection rules:
//   - Already installed (display-mode: standalone OR iOS navigator.standalone)
//     → render nothing. Also flips to true after a successful Android prompt
//     and on the `appinstalled` event.
//   - Android Chromium → capture `beforeinstallprompt`, defer the native
//     mini-infobar, expose an "Install app" button that triggers it.
//   - iOS Safari → no programmatic install API exists; show a modal with
//     the Share → Add to Home Screen instructions.
//   - Anything else (desktop Firefox/Safari, in-app webviews) → hide.
//     Desktop Chrome will still get the Android-style button via
//     `beforeinstallprompt`, which is fine — installs from desktop are
//     legitimate even if our copy emphasises phone use.

const props = withDefaults(defineProps<{
  variant?: 'hero' | 'banner'
}>(), {
  variant: 'banner',
})

const { t } = useI18n()

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Everything below depends on browser APIs (matchMedia, userAgent,
// beforeinstallprompt). Keep all refs initialised so SSR + initial hydration
// render nothing; `ready` flips in onMounted once we've sniffed the platform.
const ready = ref(false)
const isInstalled = ref(false)
const isIos = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const dismissed = ref(false)
const showIosModal = ref(false)

const dismissKey = computed(() => `ec-install-dismissed-${props.variant}`)

function detectInstalled() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari exposes this non-standard flag when launched from home screen.
  // @ts-expect-error — non-standard Safari API
  if (window.navigator.standalone === true) return true
  return false
}

function detectIos() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ identifies as Mac; distinguish via touch points.
  const iPadOs = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(ua) || iPadOs
}

function onBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent
}

function onAppInstalled() {
  isInstalled.value = true
  deferredPrompt.value = null
}

onMounted(() => {
  isInstalled.value = detectInstalled()
  isIos.value = detectIos()
  dismissed.value = localStorage.getItem(dismissKey.value) === '1'
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
  ready.value = true
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})

// We can take action when either:
//   - the browser handed us a beforeinstallprompt event (Android/desktop Chromium), or
//   - we're on iOS Safari (we show the manual-steps modal instead).
const canPrompt = computed(() => deferredPrompt.value !== null || isIos.value)

const shouldRender = computed(() => {
  if (!ready.value) return false
  if (isInstalled.value) return false
  if (!canPrompt.value) return false
  if (props.variant === 'banner' && dismissed.value) return false
  return true
})

async function triggerInstall() {
  if (isIos.value) {
    showIosModal.value = true
    return
  }
  const evt = deferredPrompt.value
  if (!evt) return
  await evt.prompt()
  const { outcome } = await evt.userChoice
  deferredPrompt.value = null
  if (outcome === 'accepted') {
    isInstalled.value = true
  }
}

function dismiss() {
  dismissed.value = true
  try { localStorage.setItem(dismissKey.value, '1') }
  catch { /* private mode / disabled storage — keep in-memory only */ }
}
</script>

<template>
  <template v-if="shouldRender">
    <!-- HERO variant: prominent block, no dismiss (post-purchase moment) -->
    <div v-if="variant === 'hero'" class="install-hero">
      <div class="install-hero__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M12 18h.01" stroke-linecap="round" />
        </svg>
      </div>
      <div class="install-hero__copy">
        <Eyebrow tone="accent">{{ t('v0.install_prompt.eyebrow') }}</Eyebrow>
        <h2 class="install-hero__title">{{ t('v0.install_prompt.hero_title') }}</h2>
        <p class="install-hero__body">{{ t('v0.install_prompt.hero_body') }}</p>
      </div>
      <button type="button" class="install-hero__cta btn-corona" @click="triggerInstall">
        {{ isIos ? t('v0.install_prompt.cta_ios') : t('v0.install_prompt.cta_android') }}
      </button>
    </div>

    <!-- BANNER variant: compact, dismissible, for /dashboard -->
    <div v-else class="install-banner">
      <div class="install-banner__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M12 18h.01" stroke-linecap="round" />
        </svg>
      </div>
      <div class="install-banner__copy">
        <div class="install-banner__title">{{ t('v0.install_prompt.banner_title') }}</div>
        <div class="install-banner__body">{{ t('v0.install_prompt.banner_body') }}</div>
      </div>
      <button type="button" class="install-banner__cta" @click="triggerInstall">
        {{ isIos ? t('v0.install_prompt.banner_cta_ios') : t('v0.install_prompt.banner_cta_android') }}
      </button>
      <button
        type="button"
        class="install-banner__close"
        :aria-label="t('v0.install_prompt.dismiss')"
        @click="dismiss"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- iOS modal: shown when iOS user taps the install CTA. No browser API
         exists for iOS install; manual steps are the only path. -->
    <Teleport v-if="showIosModal" to="body">
      <div
        class="install-modal-backdrop"
        role="dialog"
        :aria-label="t('v0.install_prompt.ios_modal_title')"
        @click.self="showIosModal = false"
      >
        <div class="install-modal">
          <button
            type="button"
            class="install-modal__close"
            :aria-label="t('v0.install_prompt.dismiss')"
            @click="showIosModal = false"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
            </svg>
          </button>
          <Eyebrow tone="accent">{{ t('v0.install_prompt.eyebrow') }}</Eyebrow>
          <h2 class="install-modal__title">{{ t('v0.install_prompt.ios_modal_title') }}</h2>
          <ol class="install-modal__steps">
            <li>
              <span class="install-modal__step-num">1</span>
              <i18n-t keypath="v0.install_prompt.ios_step_1" tag="span" scope="global">
                <template #share>
                  <strong>{{ t('v0.install_prompt.ios_step_1_share') }}</strong>
                </template>
              </i18n-t>
            </li>
            <li>
              <span class="install-modal__step-num">2</span>
              <i18n-t keypath="v0.install_prompt.ios_step_2" tag="span" scope="global">
                <template #add>
                  <strong>{{ t('v0.install_prompt.ios_step_2_add') }}</strong>
                </template>
              </i18n-t>
            </li>
            <li>
              <span class="install-modal__step-num">3</span>
              <span>{{ t('v0.install_prompt.ios_step_3') }}</span>
            </li>
          </ol>
          <p class="install-modal__note">{{ t('v0.install_prompt.ios_modal_note') }}</p>
        </div>
      </div>
    </Teleport>
  </template>
</template>

<style scoped>
/* ─── HERO ─────────────────────────────────────────── */
.install-hero {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "icon copy"
    "cta cta";
  gap: 14px 16px;
  align-items: start;
  padding: 18px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--accent) / 0.32);
  border-radius: 12px;
  margin: 18px 16px 0;
}
@media (min-width: 640px) {
  .install-hero {
    grid-template-columns: auto 1fr auto;
    grid-template-areas: "icon copy cta";
    align-items: center;
    padding: 22px 24px;
    gap: 18px;
  }
}
.install-hero__icon {
  grid-area: icon;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgb(var(--accent) / 0.12);
  color: rgb(var(--accent));
  flex-shrink: 0;
}
.install-hero__icon svg { width: 22px; height: 22px; }
.install-hero__copy { grid-area: copy; min-width: 0; }
.install-hero__title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  margin: 6px 0 4px;
  letter-spacing: -0.01em;
}
.install-hero__body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13.5px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.7);
  margin: 0;
}
.install-hero__cta {
  grid-area: cta;
  width: 100%;
  padding: 12px 20px !important;
}
@media (min-width: 640px) {
  .install-hero__cta { width: auto; }
  .install-hero__title { font-size: 19px; }
}

/* ─── BANNER ───────────────────────────────────────── */
.install-banner {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.12);
  border-radius: 10px;
  margin: 0 16px 18px;
}
@media (min-width: 768px) {
  .install-banner { margin: 0 24px 24px; padding: 14px 18px; }
}
.install-banner__icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgb(var(--accent) / 0.12);
  color: rgb(var(--accent));
  flex-shrink: 0;
}
.install-banner__icon svg { width: 18px; height: 18px; }
.install-banner__copy { min-width: 0; }
.install-banner__title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  line-height: 1.25;
}
.install-banner__body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.35;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 2px;
}
.install-banner__cta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--accent));
  background: transparent;
  border: 1px solid rgb(var(--accent) / 0.4);
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  min-height: 36px;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.install-banner__cta:hover {
  background: rgb(var(--accent) / 0.12);
  color: rgb(var(--accent-strong));
  border-color: rgb(var(--accent-strong));
}
.install-banner__close {
  background: transparent;
  border: 0;
  padding: 6px;
  color: rgb(var(--ink-1) / 0.45);
  cursor: pointer;
  border-radius: 4px;
  min-width: 32px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.install-banner__close:hover {
  color: rgb(var(--ink-1));
  background: rgb(var(--ink-1) / 0.06);
}
.install-banner__close svg { width: 14px; height: 14px; }

/* ─── iOS MODAL ────────────────────────────────────── */
.install-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(0 0 0 / 0.6);
  backdrop-filter: blur(4px);
}
.install-modal {
  position: relative;
  max-width: 420px;
  width: 100%;
  background: rgb(var(--bg-elevated));
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  border-radius: 14px;
  padding: 28px 24px 24px;
  color: rgb(var(--ink-1));
}
.install-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: 0;
  padding: 8px;
  color: rgb(var(--ink-1) / 0.55);
  cursor: pointer;
  border-radius: 4px;
  min-width: 36px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.install-modal__close:hover { color: rgb(var(--ink-1)); }
.install-modal__close svg { width: 18px; height: 18px; }
.install-modal__title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  margin: 8px 0 18px;
  letter-spacing: -0.01em;
}
.install-modal__steps {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.install-modal__steps li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.85);
}
.install-modal__step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgb(var(--accent) / 0.16);
  color: rgb(var(--accent));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.install-modal__steps :deep(strong) {
  color: rgb(var(--ink-1));
  font-weight: 700;
}
.install-modal__note {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.55);
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.1);
}
</style>
