<script setup lang="ts">
const { t } = useI18n()
const { remaining } = useCountdown()

function padZero(n: number): string {
  return n.toString().padStart(2, '0')
}

const units = computed(() => [
  { digits: remaining.value.days >= 100 ? remaining.value.days.toString().split('') : padZero(remaining.value.days).split(''), label: t('countdown.days'), primary: true },
  { digits: padZero(remaining.value.hours).split(''), label: t('countdown.hours'), primary: false },
  { digits: padZero(remaining.value.minutes).split(''), label: t('countdown.minutes'), primary: false },
  { digits: padZero(remaining.value.seconds).split(''), label: t('countdown.seconds'), primary: false },
])
</script>

<template>
  <div class="flex items-end justify-center gap-4 sm:gap-6 md:gap-8">
    <template v-for="(unit, idx) in units" :key="idx">
      <!-- Colon separator -->
      <div
        v-if="idx > 0"
        class="hidden sm:flex flex-col items-center gap-1.5 pb-7"
      >
        <span class="w-1.5 h-1.5 rounded-sm bg-slate-600" />
        <span class="w-1.5 h-1.5 rounded-sm bg-slate-600" />
      </div>

      <div class="flex flex-col items-center">
        <!-- Flip tiles -->
        <div class="flex gap-1">
          <div
            v-for="(digit, dIdx) in unit.digits"
            :key="dIdx"
            class="flip-tile"
          >
            <!-- Top half -->
            <div class="flip-top">
              <span class="flip-digit">{{ digit }}</span>
            </div>
            <!-- Split line -->
            <div class="flip-split" />
            <!-- Bottom half -->
            <div class="flip-bottom">
              <span class="flip-digit">{{ digit }}</span>
            </div>
          </div>
        </div>

        <!-- Label -->
        <span
          class="mt-2.5 sm:mt-3 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-mono"
          :class="unit.primary ? 'text-slate-400' : 'text-slate-600'"
        >
          {{ unit.label }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.flip-tile {
  position: relative;
  width: 32px;
  height: 52px;
  perspective: 200px;
}

@media (min-width: 640px) {
  .flip-tile {
    width: 42px;
    height: 66px;
  }
}

@media (min-width: 768px) {
  .flip-tile {
    width: 52px;
    height: 80px;
  }
}

.flip-top,
.flip-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  overflow: hidden;
  background: #0c1222;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flip-top {
  top: 0;
  border-radius: 4px 4px 0 0;
  border: 1px solid rgba(26, 37, 64, 0.6);
  border-bottom: none;
  /* Slight inner shadow for depth */
  box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.3);
}

.flip-bottom {
  bottom: 0;
  border-radius: 0 0 4px 4px;
  border: 1px solid rgba(26, 37, 64, 0.6);
  border-top: none;
  /* Subtle highlight at bottom for 3D effect */
  box-shadow:
    inset 0 4px 8px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.flip-split {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2;
  /* Thin shadow lines to simulate the gap between halves */
  box-shadow:
    0 -1px 0 rgba(26, 37, 64, 0.3),
    0 1px 0 rgba(0, 0, 0, 0.4);
}

.flip-digit {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
  letter-spacing: -0.02em;
  line-height: 1;
  /* Position in center of full tile (visible through each half) */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: digit-glow 4s ease-in-out infinite;
}

.flip-top .flip-digit {
  font-size: 28px;
  /* Offset to show top half of digit */
  top: 100%;
  transform: translate(-50%, -50%);
}

.flip-bottom .flip-digit {
  font-size: 28px;
  /* Offset to show bottom half of digit */
  top: 0%;
  transform: translate(-50%, -50%);
}

@media (min-width: 640px) {
  .flip-top .flip-digit,
  .flip-bottom .flip-digit {
    font-size: 36px;
  }
}

@media (min-width: 768px) {
  .flip-top .flip-digit,
  .flip-bottom .flip-digit {
    font-size: 44px;
  }
}

@keyframes digit-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0)); }
  50% { filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.4)); }
}
</style>
