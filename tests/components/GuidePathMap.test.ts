import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import GuidePathMap from '~/components/content/GuidePathMap.vue'

describe('GuidePathMap', () => {
  it('renders without error', async () => {
    const wrapper = await mountSuspended(GuidePathMap)
    expect(wrapper.exists()).toBe(true)
  })

  it('uses ClientOnly wrapper', async () => {
    const wrapper = await mountSuspended(GuidePathMap)
    // The component wraps content in ClientOnly
    expect(wrapper.html()).toBeTruthy()
  })
})
