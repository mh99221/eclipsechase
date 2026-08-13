// Eclipse instant + "has it happened yet" both live in ~/utils/eventStatus
// so the archive copy on the landing page and this countdown can never
// disagree about the boundary.
import { ECLIPSE_DATE, hasEclipsePassed } from '~/utils/eventStatus'

export function useCountdown() {
  const now = useState('countdown-now', () => Date.now())

  /** True once the eclipse instant is behind us — components branch on this
   *  to render a past-tense state instead of a ticking countdown. */
  const passed = computed(() => hasEclipsePassed(new Date(now.value)))

  const remaining = computed(() => {
    const diff = ECLIPSE_DATE.getTime() - now.value
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      total: diff,
    }
  })

  let interval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    interval = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return { remaining, passed, eclipseDate: ECLIPSE_DATE }
}
