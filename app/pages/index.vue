<script setup lang="ts">
const { t } = useI18n()
const siteUrl = useRuntimeConfig().public.siteUrl as string

defineOgImage({
  title: 'Find Clear Skies on Eclipse Day',
  subtitle: 'Real-time weather tracking for the 2026 total solar eclipse in Iceland.',
})

useHead(() => ({
  title: t('meta.title'),
  titleTemplate: '%s',
  meta: [
    { name: 'description', content: t('meta.description') },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            'name': 'EclipseChase.is',
            'url': siteUrl,
            'description': t('meta.description'),
            'inLanguage': ['en', 'is'],
          },
          {
            '@type': 'Event',
            'name': 'Total Solar Eclipse in Iceland 2026',
            'startDate': '2026-08-12T17:43:00+00:00',
            'endDate': '2026-08-12T17:48:00+00:00',
            'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
            'eventStatus': 'https://schema.org/EventScheduled',
            'location': {
              '@type': 'Place',
              'name': 'Western Iceland',
              'geo': {
                '@type': 'GeoCoordinates',
                'latitude': 64.15,
                'longitude': -21.94,
              },
              'address': {
                '@type': 'PostalAddress',
                'addressCountry': 'IS',
                'addressRegion': 'Western Iceland',
              },
            },
            'description': 'Total solar eclipse visible from Western Iceland. Maximum totality duration 2m 18s. Path crosses Westfjords, Snæfellsnes, and Reykjanes.',
            'image': `${siteUrl}/og-image.jpg`,
            'url': siteUrl,
            'organizer': {
              '@type': 'Organization',
              'name': 'EclipseChase.is',
              'url': siteUrl,
            },
          },
        ],
      }),
    },
  ],
}))

// Staggered reveal on mount
const heroReady = ref(false)
const countdownReady = ref(false)

// Intersection observer for scroll animations
const featuresRef = ref<HTMLElement | null>(null)
const signupRef = ref<HTMLElement | null>(null)
const featuresVisible = ref(false)
const signupVisible = ref(false)

let staggerTimer: ReturnType<typeof setTimeout>

onMounted(() => {
  // Stagger hero content reveal
  requestAnimationFrame(() => {
    heroReady.value = true
    staggerTimer = setTimeout(() => { countdownReady.value = true }, 400)
  })

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target === featuresRef.value && entry.isIntersecting) {
          featuresVisible.value = true
        }
        if (entry.target === signupRef.value && entry.isIntersecting) {
          signupVisible.value = true
        }
      })
    },
    { threshold: 0.1 }
  )

  if (featuresRef.value) observer.observe(featuresRef.value)
  if (signupRef.value) observer.observe(signupRef.value)

  onUnmounted(() => {
    clearTimeout(staggerTimer)
    observer.disconnect()
  })
})

const dataStripItems = [
  { color: 'bg-corona/60', label: 'data_strip.totality', value: 'data_strip.totality_value' },
  { color: 'bg-ice/60', label: 'data_strip.sun_alt', value: 'data_strip.sun_alt_value' },
  { color: 'bg-corona/60', label: 'data_strip.path', value: 'data_strip.path_value' },
  { color: 'bg-red-400/60', label: 'data_strip.next', value: 'data_strip.next_value' },
]

const features = computed(() => [
  {
    title: t('features.weather.title'),
    description: t('features.weather.description'),
    accent: 'corona',
    number: '01',
  },
  {
    title: t('features.recommendations.title'),
    description: t('features.recommendations.description'),
    accent: 'ice',
    number: '02',
  },
  {
    title: t('features.offline.title'),
    description: t('features.offline.description'),
    accent: 'corona',
    number: '03',
  },
  {
    title: t('features.timeline.title'),
    description: t('features.timeline.description'),
    accent: 'ice',
    number: '04',
  },
])
</script>

<template>
  <div class="relative noise">
    <Starfield />

    <!-- ═══════════════════════════════════════════ -->
    <!-- HERO -->
    <!-- ═══════════════════════════════════════════ -->
    <header class="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-16 pb-12 overflow-hidden">
      <!-- Atmospheric gradient orbs -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-radial from-corona/[0.04] to-transparent blur-3xl pointer-events-none" />
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-ice/[0.02] blur-[100px] pointer-events-none" />

      <!-- Top bar — minimal nav -->
      <nav class="absolute top-0 left-0 right-0 flex items-center justify-between px-6 sm:px-10 py-5 z-10">
        <div class="flex items-center gap-3">
          <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="36" fill="#050810" />
            <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
            <circle cx="96" cy="48" r="4" fill="#f59e0b" />
          </svg>
          <span class="font-display font-semibold text-base tracking-wide text-slate-300">
            ECLIPSECHASE
          </span>
        </div>
        <div class="flex items-center gap-4">
          <span class="hidden sm:inline text-xs font-mono text-slate-500 tracking-wider">
            64.1°N 21.9°W
          </span>
          <div class="w-px h-4 bg-void-border hidden sm:block" />
          <span class="text-xs font-mono text-corona/70 tracking-wider">
            AUG 12 2026
          </span>
        </div>
      </nav>

      <!-- Eclipse illustration -->
      <EclipseHero class="mb-5 sm:mb-7" />

      <!-- Headline -->
      <div
        class="text-center max-w-3xl transition-all duration-700 ease-out"
        :class="heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <p class="font-mono italic text-slate-400 text-base mb-3 tracking-wide">
          {{ t('hero.date_location') }}
        </p>
        <h1 class="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] text-white">
          {{ t('hero.title') }}<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-corona to-corona-bright">{{ t('hero.title_accent') }}</span>
        </h1>
        <p class="mt-5 sm:mt-6 text-base text-slate-400 leading-relaxed max-w-xl mx-auto font-light">
          {{ t('hero.subtitle') }}
        </p>
      </div>

      <!-- Countdown -->
      <div
        class="mt-10 sm:mt-12 transition-all duration-700 ease-out"
        :class="countdownReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <p class="font-display text-xs uppercase tracking-[0.3em] text-slate-500 mb-4 text-center">
          {{ t('countdown.title') }}
        </p>
        <CountdownBar />
      </div>

      <!-- Scroll indicator -->
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-1000"
        :class="countdownReady ? 'opacity-100' : 'opacity-0'"
        style="transition-delay: 600ms"
      >
        <span class="text-[11px] font-display uppercase tracking-[0.3em] text-slate-600">{{ t('hero.scroll') }}</span>
        <div class="w-px h-6 bg-gradient-to-b from-slate-700 to-transparent" />
      </div>
    </header>

    <!-- ═══════════════════════════════════════════ -->
    <!-- ECLIPSE DATA STRIP -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="border-y border-void-border/50 bg-void-deep/50 backdrop-blur-sm">
      <div class="section-container py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm md:flex-nowrap md:justify-between font-mono tracking-wider">
        <div v-for="item in dataStripItems" :key="item.label" class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full" :class="item.color" />
          <span class="text-slate-500">{{ t(item.label) }}</span>
          <span class="text-slate-300">{{ t(item.value) }}</span>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- FEATURES -->
    <!-- ═══════════════════════════════════════════ -->
    <section ref="featuresRef" class="relative py-20 sm:py-28">
      <!-- Subtle topographic lines background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <svg class="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path v-for="i in 12" :key="i"
            :d="`M0 ${i * 50 + 20} Q250 ${i * 50 + (i % 2 === 0 ? -30 : 40)} 500 ${i * 50 + 10} Q750 ${i * 50 + (i % 2 === 0 ? 50 : -20)} 1000 ${i * 50 + 30}`"
            fill="none"
            stroke="#7dd3fc"
            stroke-width="0.5"
          />
        </svg>
      </div>

      <div class="section-container">
        <!-- Section header -->
        <div
          class="mb-14 max-w-2xl transition-all duration-700 ease-out"
          :class="featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <span class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase">{{ t('features.label') }}</span>
          <h2 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 leading-tight">
            {{ t('features.title') }}<br>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">{{ t('features.title_accent') }}</span>
          </h2>
        </div>

        <!-- Feature items — editorial layout -->
        <div>
          <div
            v-for="(feature, idx) in features"
            :key="feature.number"
            class="group relative transition-all duration-600 ease-out"
            :class="featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
            :style="{ transitionDelay: `${100 + idx * 80}ms` }"
          >
            <div class="flex items-start gap-6 sm:gap-10 py-7 sm:py-8 border-t border-void-border/40
                        transition-all duration-500 hover:bg-void-surface/30 px-4 sm:px-6 -mx-4 sm:-mx-6">
              <!-- Number -->
              <span
                class="font-mono text-xs tracking-wider transition-colors duration-300 pt-1 shrink-0"
                :class="feature.accent === 'corona' ? 'text-corona/20 group-hover:text-corona/50' : 'text-ice/20 group-hover:text-ice/50'"
              >
                {{ feature.number }}
              </span>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <h3 class="font-display text-xl sm:text-2xl font-semibold text-white/90 group-hover:text-white transition-colors duration-300 mb-2">
                  {{ feature.title }}
                </h3>
                <p class="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl group-hover:text-slate-300 transition-colors duration-300">
                  {{ feature.description }}
                </p>
              </div>

              <!-- Arrow -->
              <div class="hidden sm:flex items-center pt-1.5 shrink-0">
                <svg
                  class="w-4 h-4 text-void-border group-hover:text-corona/40 transition-all duration-300 group-hover:translate-x-1"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════ -->
    <!-- SIGNUP -->
    <!-- ═══════════════════════════════════════════ -->
    <section ref="signupRef" class="relative py-20 sm:py-28 overflow-hidden">
      <!-- Ambient glow -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-corona/[0.03] blur-[120px] pointer-events-none" />

      <div
        class="section-container text-center transition-all duration-700 ease-out"
        :class="signupVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <span class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase">{{ t('signup.label') }}</span>
        <h2 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-3">
          {{ t('signup.title') }}
        </h2>
        <p class="text-slate-400 mb-10 max-w-lg mx-auto text-base leading-relaxed">
          {{ t('signup.subtitle') }}
        </p>
        <EmailSignup />
      </div>
    </section>

    <!-- ═══════════════════════════════════════════ -->
    <!-- FOOTER -->
    <!-- ═══════════════════════════════════════════ -->
    <footer class="border-t border-void-border/30 py-12">
      <div class="section-container">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Brand -->
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 128 128" fill="none">
              <circle cx="64" cy="64" r="36" fill="#050810" />
              <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.6" />
              <circle cx="96" cy="48" r="3" fill="#f59e0b" opacity="0.8" />
            </svg>
            <span class="font-display text-sm tracking-[0.2em] text-slate-500 uppercase">
              EclipseChase.is
            </span>
          </div>

          <!-- Tagline -->
          <p class="font-mono italic text-slate-500 text-sm">
            {{ t('footer.tagline') }}
          </p>

          <!-- Meta -->
          <div class="flex items-center gap-4 text-xs font-mono text-slate-500 tracking-wider">
            <NuxtLink to="/privacy" class="hover:text-slate-300 transition-colors">
              {{ t('footer.privacy') }}
            </NuxtLink>
            <div class="w-px h-3 bg-void-border" />
            <span>{{ t('footer.eclipse_date') }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
