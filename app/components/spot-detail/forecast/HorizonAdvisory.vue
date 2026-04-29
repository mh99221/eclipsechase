<script setup lang="ts">
/**
 * Horizon advisory shown at the top of the Weather tab when the spot's
 * 91-point horizon sweep returns a verdict of `risky` or `blocked`.
 *
 * Why surface this on the Weather tab specifically: if terrain blocks
 * the sun, cloud-cover forecasts are moot — there's no view to occlude.
 * Without this banner, a user on the Weather tab seeing a clean cloud
 * forecast at a blocked spot could walk away thinking the spot is
 * viable. Pre-empts the climatology card so the geometry signal arrives
 * before the clouds story.
 *
 * `clear` and `marginal` verdicts deliberately don't render this — at
 * those clearances the cloud forecast is the dominant variable and the
 * Sky tab's StatStrip already shows the verdict subtly. Only `risky`
 * and `blocked` are worth interrupting for.
 *
 * Closes spec §10 open question 2 ("horizon_blocked_west flag"): the
 * underlying `horizon_check.verdict` is more granular than a boolean
 * and already drives the StatStrip; this component adds the missing
 * Weather-tab cross-reference so the geometry/clouds interaction reads
 * correctly to users.
 */
import type { HorizonVerdict } from '~/types/horizon'

const props = defineProps<{
  verdict: HorizonVerdict
  clearance: number
}>()

const emit = defineEmits<{
  (e: 'view-sky'): void
}>()

const { t } = useI18n()

// `clearance` from horizon_check.clearance_degrees — positive when sun
// clears terrain, negative when blocked (signed). Display as absolute
// magnitude with sign-aware copy keys below.
const clearanceAbs = computed(() => Math.abs(props.clearance).toFixed(1))
</script>

<template>
  <div class="horizon-advisory" :data-verdict="verdict" role="alert">
    <div class="advisory-header">
      <svg
        class="advisory-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <!-- Mountain/horizon glyph: two peaks with a rising sun. Reads as
             "terrain meets sky" without requiring text. -->
        <path d="M3 19h18M5 19l5-7 4 4 3-5 4 8" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="17" cy="7" r="2" fill="currentColor" stroke="none" />
      </svg>
      <h3 class="advisory-title">
        <template v-if="verdict === 'blocked'">{{ t('v0.forecast.horizon_advisory_blocked_title') }}</template>
        <template v-else>{{ t('v0.forecast.horizon_advisory_risky_title') }}</template>
      </h3>
    </div>

    <p class="advisory-body">
      <template v-if="verdict === 'blocked'">
        {{ t('v0.forecast.horizon_advisory_blocked_body', { clearance: clearanceAbs }) }}
      </template>
      <template v-else>
        {{ t('v0.forecast.horizon_advisory_risky_body', { clearance: clearanceAbs }) }}
      </template>
    </p>

    <button class="advisory-cta" type="button" @click="emit('view-sky')">
      {{ t('v0.forecast.horizon_advisory_cta') }}
    </button>
  </div>
</template>

<style scoped>
/* Severity-tinted card — bad for blocked, warn for risky. The tinted
   left border is intentionally heavier than v0's standard subtle border
   because this advisory deserves visual weight; we're telling the user
   the spot may not work. */
.horizon-advisory {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid;
  border-left-width: 3px;
}
.horizon-advisory[data-verdict='blocked'] {
  background: rgb(var(--bad) / 0.08);
  border-color: rgb(var(--bad) / 0.32);
  border-left-color: rgb(var(--bad));
  color: rgb(var(--bad));
}
.horizon-advisory[data-verdict='risky'] {
  background: rgb(var(--warn) / 0.08);
  border-color: rgb(var(--warn) / 0.32);
  border-left-color: rgb(var(--warn));
  color: rgb(var(--warn));
}

.advisory-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.advisory-icon {
  flex-shrink: 0;
  /* currentColor inherits the verdict tint above. */
}
.advisory-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  /* Title stays tinted to match the icon — body copy below switches to
     ink-1 so it reads cleanly. */
}

.advisory-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.85);
  margin: 4px 0 10px;
}

.advisory-cta {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
  /* Inherit verdict colour so the CTA matches the title. */
}
.advisory-cta:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.advisory-cta:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 2px;
}
</style>
