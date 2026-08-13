import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HomeTileGrid from '~/components/HomeTileGrid.vue'

// vue-i18n is stubbed globally in tests/mocks/setup.ts.

describe('HomeTileGrid', () => {
  it('renders only the two surviving destinations', async () => {
    const wrapper = await mountSuspended(HomeTileGrid)
    const tiles = wrapper.findAll('[data-testid="home-tile"]')
    expect(tiles).toHaveLength(2)
    expect(tiles.map(t => t.attributes('href'))).toEqual(['/spots', '/guide'])
  })

  it('offers no purchase tile and no retired routes', async () => {
    const wrapper = await mountSuspended(HomeTileGrid)
    const html = wrapper.html()
    expect(html).not.toContain('/pro')
    expect(html).not.toContain('/map')
    expect(html).not.toContain('/dashboard')
  })
})
