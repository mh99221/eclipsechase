<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => t('pro.title'),
  meta: [
    { name: 'description', content: () => t('pro.description') },
  ],
})

const route = useRoute()
const cancelled = computed(() => route.query.cancelled === 'true')

const { isPro } = useProStatus()

// Redirect if already Pro
watch(isPro, (pro) => {
  if (import.meta.client && pro) navigateTo('/map')
}, { immediate: true })

// Checkout state
const checkoutSubmitting = ref(false)
const checkoutError = ref('')
const waiverAccepted = ref(false)

async function handleCheckout() {
  if (!waiverAccepted.value) {
    checkoutError.value = t('pro.waiver_required')
    return
  }

  checkoutError.value = ''
  checkoutSubmitting.value = true

  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
    })

    if (url) {
      navigateTo(url, { external: true })
    }
    else {
      checkoutError.value = t('pro.checkout_error')
    }
  }
  catch (err: any) {
    checkoutError.value = err?.data?.statusMessage || t('pro.generic_error')
  }
  finally {
    checkoutSubmitting.value = false
  }
}

// Three-bucket comparison shown above the price card. Order matters:
// "Plan in advance" first (everything you ALREADY get free, reduces buyer
// anxiety), then "Decide on the day" (the conversion-driver — every row
// is Pro-only and answers a real day-of question), then "On the road"
// (practical PWA polish). Row labels live in v0.pro_compare.* — Icelandic
// falls back to English for the v0.* namespace via Nuxt i18n.
type CompareRow = { key: string; free: boolean; pro: boolean }
const compareSections: Array<{ titleKey: string; rows: CompareRow[] }> = [
  {
    titleKey: 'section_plan',
    rows: [
      { key: 'row_plan_browse', free: true, pro: true },
      { key: 'row_plan_times', free: true, pro: true },
      { key: 'row_plan_history', free: true, pro: true },
      { key: 'row_plan_guide', free: true, pro: true },
    ],
  },
  {
    titleKey: 'section_decide',
    rows: [
      { key: 'row_decide_map', free: false, pro: true },
      { key: 'row_decide_personalised', free: false, pro: true },
      { key: 'row_decide_horizon', free: false, pro: true },
      { key: 'row_decide_roads', free: false, pro: true },
      { key: 'row_decide_dashboard', free: false, pro: true },
    ],
  },
  {
    titleKey: 'section_road',
    rows: [
      { key: 'row_road_offline', free: false, pro: true },
    ],
  },
]
</script>

<template>
  <PageShell screen="pro" width="reading">
    <div class="pro-body">
      <!-- Cancelled banner -->
      <div
        v-if="cancelled"
        class="mb-8 px-4 py-3 ec-banner-warn text-sm font-mono"
      >
        {{ t('pro.cancelled') }}
      </div>

      <!-- Header -->
      <div class="mb-12">
        <Eyebrow tone="accent">{{ t('pro.unlock') }}</Eyebrow>
        <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink-1 mt-2 mb-4">
          {{ t('pro.heading') }}
        </h1>
        <p class="text-base sm:text-lg text-ink-3 max-w-xl">
          {{ t('pro.subtitle') }}
        </p>
      </div>

      <!-- Free vs Pro comparison.
           Three-bucket teaser: shared features (reassurance) → Pro-only
           day-of features (conversion) → PWA polish. Drives off the
           compareSections data + v0.pro_compare.* i18n keys. -->
      <Card class="compare-card">
        <CardTitle>{{ t('v0.pro_compare.header') }}</CardTitle>
        <table class="compare-table">
          <thead>
            <tr>
              <th />
              <th scope="col">{{ t('v0.pro_compare.free_col') }}</th>
              <th scope="col">{{ t('v0.pro_compare.pro_col') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="section in compareSections" :key="section.titleKey">
              <tr class="section-row">
                <th scope="rowgroup" colspan="3">{{ t(`v0.pro_compare.${section.titleKey}`) }}</th>
              </tr>
              <tr v-for="row in section.rows" :key="row.key">
                <th scope="row" class="row-l">{{ t(`v0.pro_compare.${row.key}`) }}</th>
                <td class="row-v" :data-state="row.free ? 'yes' : 'no'">
                  <span :aria-label="row.free ? t('v0.pro_compare.included') : t('v0.pro_compare.not_included')">
                    {{ row.free ? '✓' : '—' }}
                  </span>
                </td>
                <td class="row-v" :data-state="row.pro ? 'yes' : 'no'">
                  <span :aria-label="row.pro ? t('v0.pro_compare.included') : t('v0.pro_compare.not_included')">
                    {{ row.pro ? '✓' : '—' }}
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <p class="compare-tagline">{{ t('v0.pro_compare.tagline') }}</p>
      </Card>

      <!-- Price card + Checkout. Custom .price-card surface rather than a
           bare <Card>: hero pricing wants stronger accent emphasis and
           larger padding than Card's 14 px default. Uses the same
           surface/border idiom as Card so it sits in the same v0 family. -->
      <div class="price-card">
        <Eyebrow tone="accent" align="center">{{ t('pro.price') }}</Eyebrow>
        <div class="price-amount">&euro;9.99</div>

        <!-- Withdrawal waiver checkbox -->
        <div class="price-waiver">
          <label class="price-waiver-label">
            <input
              v-model="waiverAccepted"
              type="checkbox"
              class="price-waiver-cb"
            >
            <span>
              {{ t('pro.withdrawal_waiver_pre') }}
              <NuxtLink to="/terms">{{ t('pro.terms_link_text') }}</NuxtLink>
              {{ t('pro.withdrawal_waiver_and') }}
              <NuxtLink to="/privacy">{{ t('pro.privacy_link_text') }}</NuxtLink>.
            </span>
          </label>
        </div>

        <!-- Error -->
        <p v-if="checkoutError" class="price-error">
          {{ checkoutError }}
        </p>

        <!-- Checkout button -->
        <button
          :disabled="checkoutSubmitting || !waiverAccepted"
          class="price-cta"
          @click="handleCheckout"
        >
          <span v-if="checkoutSubmitting" class="price-cta-loading">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ t('pro.processing') }}</span>
          </span>
          <span v-else>{{ t('pro.get_access') }}</span>
        </button>

        <p class="price-stripe-note">{{ t('pro.stripe_note') }}</p>
      </div>

      <!-- Restore Purchase -->
      <RestorePurchase />
    </div>

    <AppFooter />
  </PageShell>
</template>

<style scoped>
/* Content padding inside PageShell. Mirrors the legacy `py-8 sm:py-16
   + section-container` rhythm so the visual cadence of header → cards
   → footer matches what the page had on its noise-textured legacy
   chrome — but now under v0's BrandBar/BottomNav. */
.pro-body {
  padding: 32px 16px;
}
@media (min-width: 768px) {
  .pro-body {
    padding: 64px 24px;
  }
}

.compare-card {
  margin-bottom: 32px;
}
.compare-table {
  width: 100%;
  border-collapse: collapse;
}
.compare-table thead th {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: rgb(var(--ink-1) / 0.62);
  text-transform: uppercase;
  font-weight: 500;
  text-align: center;
  padding-bottom: 10px;
  width: 64px;
}
.compare-table thead th:first-child { width: auto; }

/* Section header row spans all three columns and provides the visual
   group break. The :first-child guard kills the top border so the first
   group sits flush under the column headers. */
.compare-table .section-row th {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  text-align: left;
  padding: 14px 0 4px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
}
.compare-table tbody tr.section-row:first-child th {
  border-top: 0;
  padding-top: 4px;
}

.compare-table .row-l {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: rgb(var(--ink-1) / 0.85);
  text-align: left;
  padding: 6px 12px 6px 0;
}
.compare-table .row-v {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  padding: 6px 0;
}
.compare-table .row-v[data-state='yes'] { color: rgb(var(--good)); }
.compare-table .row-v[data-state='no']  { color: rgb(var(--ink-1) / 0.32); }

.compare-tagline {
  margin-top: 18px;
  text-align: center;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(var(--ink-1) / 0.62);
}

/* ── Price card ─────────────────────────────────────────────────
   Same v0 surface idiom as Card.vue (translucent fill on top of
   page bg, soft border, 12 px radius) but with accent-tinted
   border for emphasis and roomier padding so the €9.99 reads as
   the page's primary CTA. */
.price-card {
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--accent) / 0.22);
  border-radius: 12px;
  padding: 24px 18px;
  text-align: center;
  margin-bottom: 32px;
}
@media (min-width: 768px) {
  .price-card { padding: 36px 32px; }
}

.price-amount {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 56px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 10px 0 24px;
}
@media (min-width: 768px) {
  .price-amount { font-size: 68px; }
}

.price-waiver {
  max-width: 320px;
  margin: 0 auto 14px;
  text-align: left;
}
.price-waiver-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}
/* Checkbox uses the semantic --accent token in both themes via
   accent-color. Replaces the legacy `accent-corona` Tailwind class
   which pinned to the dark-only #f59e0b. */
.price-waiver-cb {
  margin-top: 3px;
  flex-shrink: 0;
  accent-color: rgb(var(--accent));
}
.price-waiver-label > span {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.62);
}
.price-waiver-label a {
  color: rgb(var(--accent));
  text-decoration: none;
  transition: color 0.2s;
}
.price-waiver-label a:hover {
  color: rgb(var(--accent-strong));
}

.price-error {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  color: rgb(var(--bad));
  margin-bottom: 14px;
}

/* Replaces .btn-corona — that helper hardcodes the dark-theme amber
   gradient, so it doesn't follow into the light theme. This CTA uses
   the semantic --accent / --accent-ink pair like every other v0 CTA
   (see SelectedLightbox `.lb-cta`). */
.price-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  min-height: 48px;
  padding: 14px 18px;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  border: 0;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.price-cta:hover:not(:disabled) {
  background: rgb(var(--accent-strong));
}
.price-cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.price-cta-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.price-stripe-note {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--ink-1) / 0.42);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-top: 16px;
}
</style>
