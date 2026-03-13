// Eclipse totality mid-point: August 12, 2026 at 17:46 UTC
const ECLIPSE_DATE = new Date('2026-08-12T17:46:00Z')

export function useCountdown() {
  const now = useState('countdown-now', () => Date.now())

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

  return { remaining, eclipseDate: ECLIPSE_DATE }
}
