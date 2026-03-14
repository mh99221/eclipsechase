const REYKJAVIK: [number, number] = [64.1466, -21.9426]

export function useLocation() {
  const coords = ref<[number, number]>(REYKJAVIK)
  const isGps = ref(false)
  const error = ref<string | null>(null)

  function request() {
    if (!navigator.geolocation) {
      error.value = 'Geolocation not supported'
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords.value = [pos.coords.latitude, pos.coords.longitude]
        isGps.value = true
      },
      (err) => {
        error.value = err.message
      },
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  return { coords, isGps, error, request }
}
