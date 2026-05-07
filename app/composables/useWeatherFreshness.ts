import { computed, onMounted, onUnmounted, ref, toValue, type MaybeRefOrGetter } from 'vue'

// One ticker shared across every consumer (status pill, sheet, desktop
// stack). Refcounted so the interval clears as soon as the last consumer
// unmounts — keeps a /map page that hides the chrome from doing
// once-a-minute reactivity for nothing.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
let consumers = 0

function ensureTicker() {
  if (consumers === 0) {
    now.value = Date.now()
    timer = setInterval(() => { now.value = Date.now() }, 60_000)
  }
  consumers++
}

function releaseTicker() {
  consumers = Math.max(0, consumers - 1)
  if (consumers === 0 && timer) {
    clearInterval(timer)
    timer = null
  }
}

export function useWeatherFreshness(
  fetchedAt: MaybeRefOrGetter<string | null>,
  stale: MaybeRefOrGetter<boolean>,
) {
  const { t } = useI18n()

  // Ticker is browser-only — Nuxt's compat layer rejects setInterval on
  // the server. Use onMounted so SSR setup never starts a timer.
  onMounted(ensureTicker)
  onUnmounted(releaseTicker)

  const ageMin = computed<number | null>(() => {
    const iso = toValue(fetchedAt)
    if (!iso) return null
    const ts = new Date(iso).getTime()
    if (Number.isNaN(ts)) return null
    return Math.max(0, Math.floor((now.value - ts) / 60_000))
  })

  const dot = computed<'good' | 'warn' | 'bad'>(() => {
    if (toValue(stale)) return 'bad'
    const m = ageMin.value
    if (m == null) return 'warn'
    if (m <= 30) return 'good'
    if (m <= 90) return 'warn'
    return 'bad'
  })

  const statusLabel = computed(() => {
    if (toValue(stale)) return t('map.weather_stale')
    const m = ageMin.value
    if (m == null) return t('map.weather_loading')
    if (m < 1) return t('map.weather_just_now')
    return t('map.weather_updated_ago', { minutes: m })
  })

  // Compact form for the mobile pill: "5m" / "2h" / "1d" / "—".
  const shortLabel = computed(() => {
    const m = ageMin.value
    if (m == null) return '—'
    if (m < 1) return t('map.pill_just_now')
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  })

  return { ageMin, dot, statusLabel, shortLabel }
}
