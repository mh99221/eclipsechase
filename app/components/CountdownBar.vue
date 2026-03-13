<script setup lang="ts">
const { t } = useI18n()
const { remaining } = useCountdown()

function padZero(n: number): string {
  return n.toString().padStart(2, '0')
}

const units = computed(() => [
  { value: remaining.value.days, label: t('countdown.days'), large: true },
  { value: remaining.value.hours, label: t('countdown.hours'), large: false },
  { value: remaining.value.minutes, label: t('countdown.minutes'), large: false },
  { value: remaining.value.seconds, label: t('countdown.seconds'), large: false },
])
</script>

<template>
  <div class="flex items-end justify-center gap-3 sm:gap-6 md:gap-8">
    <template v-for="(unit, idx) in units" :key="idx">
      <!-- Separator dot -->
      <div
        v-if="idx > 0"
        class="hidden sm:flex flex-col items-center gap-2 pb-6"
      >
        <span class="w-1 h-1 rounded-full bg-corona/30" />
        <span class="w-1 h-1 rounded-full bg-corona/30" />
      </div>

      <div class="flex flex-col items-center">
        <!-- Number -->
        <div class="relative">
          <!-- Glow behind number -->
          <div
            class="absolute inset-0 blur-2xl rounded-full opacity-20"
            :style="{ backgroundColor: idx === 0 ? 'var(--corona)' : 'transparent' }"
          />
          <span
            class="relative block font-mono tabular-nums tracking-tighter leading-none"
            :class="[
              unit.large
                ? 'text-5xl sm:text-7xl md:text-8xl text-corona-bright animate-count-glow'
                : 'text-4xl sm:text-5xl md:text-6xl text-slate-200',
            ]"
            :style="{ fontWeight: unit.large ? 600 : 400 }"
          >
            {{ unit.value >= 100 ? unit.value : padZero(unit.value) }}
          </span>
        </div>

        <!-- Label -->
        <span
          class="mt-2 sm:mt-3 text-[10px] sm:text-xs uppercase tracking-[0.25em] font-display"
          :class="unit.large ? 'text-corona/60' : 'text-slate-600'"
        >
          {{ unit.label }}
        </span>
      </div>
    </template>
  </div>
</template>
