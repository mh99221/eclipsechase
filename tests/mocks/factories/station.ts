let counter = 0

export function resetStationCounter() {
  counter = 0
}

export function createStation(overrides: Record<string, unknown> = {}) {
  counter++

  return {
    id: `${1000 + counter}`,
    name: `Test Station ${counter}`,
    lat: 64.0 + counter * 0.1,
    lng: -22.0 - counter * 0.1,
    region: 'reykjavik' as const,
    source: 'vedur.is',
    ...overrides,
  }
}
