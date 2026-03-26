<script setup lang="ts">
import { bestRegion } from '~/utils/weather'
import { REGION_LABELS, cloudColor, cloudLevel } from '~/utils/eclipse'

definePageMeta({ middleware: ['pro-gate'] })

useHead({ title: 'Dashboard' })

const { remaining } = useCountdown()

// Weather data
const { data: cloudData, status: cloudStatus } = await useFetch('/api/weather/cloud-cover')
const { data: stationsData } = await useFetch('/api/weather/stations')

// Compute best region
const weatherBest = computed(() => {
  const stations = stationsData.value?.stations
  const cloud = cloudData.value?.cloud_cover
  if (!stations || !cloud) return null
  return bestRegion(stations, cloud)
})

const weatherLoading = computed(() => cloudStatus.value === 'pending')

// News updates from Nuxt Content
const { data: updates } = await useAsyncData('dashboard-updates', () =>
  queryContent('updates').sort({ date: -1 }).limit(5).find(),
)

// Checklist
const CHECKLIST_ITEMS = [
  'Eclipse glasses (ISO 12312-2 certified)',
  'Check weather forecast morning of eclipse day',
  'Arrive at viewing spot 2 hours before totality',
  'Fully charged phone & camera',
  'Warm layers (Iceland weather is unpredictable)',
  'Snacks & water',
]

const checkedItems = ref<Record<number, boolean>>({})

onMounted(() => {
  try {
    const saved = localStorage.getItem('eclipse-checklist')
    if (saved) checkedItems.value = JSON.parse(saved)
  } catch {}
})

function toggleItem(index: number) {
  checkedItems.value[index] = !checkedItems.value[index]
  localStorage.setItem('eclipse-checklist', JSON.stringify(checkedItems.value))
}

const checkedCount = computed(() =>
  Object.values(checkedItems.value).filter(Boolean).length,
)
</script>

<template>
  <div class="relative noise min-h-screen">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-6 sm:px-10 py-5">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
      <NuxtLink to="/map" class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider">
        OPEN MAP
      </NuxtLink>
    </nav>

    <div class="section-container max-w-3xl py-8 sm:py-16">
      <!-- 1. Hero Countdown -->
      <section class="text-center mb-12 sm:mb-16">
        <p class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase mb-4">Eclipse 2026</p>
        <CountdownBar />
      </section>

      <!-- 2. Weather Snapshot -->
      <section class="mb-8 sm:mb-12">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Best conditions now</p>

        <!-- Loading skeleton -->
        <div v-if="weatherLoading" class="bg-void-surface border border-void-border/40 rounded px-4 py-4 animate-pulse">
          <div class="h-5 bg-void-border/30 rounded w-1/3 mb-2" />
          <div class="h-4 bg-void-border/20 rounded w-1/4" />
        </div>

        <!-- Weather card -->
        <div v-else-if="weatherBest" class="bg-void-surface border border-void-border/40 rounded px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-display text-lg font-semibold text-white">
                {{ REGION_LABELS[weatherBest.region] || weatherBest.region }}
              </p>
              <p class="text-sm mt-0.5" :style="{ color: cloudColor(weatherBest.avgCloudCover) }">
                {{ weatherBest.avgCloudCover }}% cloud cover &middot; {{ cloudLevel(weatherBest.avgCloudCover).label }}
              </p>
            </div>
            <NuxtLink
              to="/map"
              class="text-xs font-mono text-corona/70 hover:text-corona transition-colors tracking-wider"
            >
              VIEW MAP &rarr;
            </NuxtLink>
          </div>
        </div>

        <!-- Fallback -->
        <div v-else class="bg-void-surface border border-void-border/40 rounded px-4 py-4">
          <p class="text-sm text-slate-500">No weather data available</p>
        </div>
      </section>

      <!-- 3. News / Updates -->
      <section v-if="updates && updates.length" class="mb-8 sm:mb-12">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Latest updates</p>
        <div class="space-y-3">
          <div
            v-for="update in updates"
            :key="update._path"
            class="bg-void-surface border border-void-border/40 rounded px-4 py-3"
          >
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1">
              {{ update.date }}
            </p>
            <p class="font-display text-sm font-semibold text-white">
              {{ update.title }}
            </p>
            <p v-if="update.summary" class="text-sm text-slate-400 mt-1 leading-relaxed">
              {{ update.summary }}
            </p>
          </div>
        </div>
      </section>

      <!-- 4. Eclipse Day Checklist -->
      <section class="mb-8 sm:mb-12">
        <div class="flex items-center justify-between mb-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Eclipse day checklist</p>
          <p class="font-mono text-[10px] text-slate-500">
            {{ checkedCount }}/{{ CHECKLIST_ITEMS.length }}
          </p>
        </div>
        <div class="bg-void-surface border border-void-border/40 rounded px-4 py-3">
          <label
            v-for="(item, idx) in CHECKLIST_ITEMS"
            :key="idx"
            class="flex items-start gap-3 py-2 cursor-pointer group"
            :class="idx < CHECKLIST_ITEMS.length - 1 ? 'border-b border-void-border/20' : ''"
          >
            <input
              type="checkbox"
              :checked="checkedItems[idx]"
              class="checklist-checkbox mt-0.5 flex-shrink-0"
              @change="toggleItem(idx)"
            >
            <span
              class="text-sm leading-relaxed transition-colors"
              :class="checkedItems[idx] ? 'text-slate-500 line-through' : 'text-slate-300'"
            >
              {{ item }}
            </span>
          </label>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.checklist-checkbox {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid rgba(26, 37, 64, 0.6);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.checklist-checkbox:checked {
  border-color: var(--corona);
  background: rgba(245, 158, 11, 0.15);
}

.checklist-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid var(--corona);
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}
</style>
