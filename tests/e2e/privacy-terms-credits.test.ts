import { expect, test } from './fixtures'

test.describe('Legal pages', () => {
  test('privacy page renders with heading', async ({ page, goto }) => {
    await goto('/privacy', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Privacy')

    // Has the noise background wrapper
    const wrapper = page.locator('.noise')
    await expect(wrapper).toBeVisible()
  })

  test('terms page renders with heading', async ({ page, goto }) => {
    await goto('/terms', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Terms')
  })

  test('credits page renders with heading', async ({ page, goto }) => {
    await goto('/credits', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Credit')
  })

  test('all legal pages have nav with ECLIPSECHASE', async ({ page, goto }) => {
    for (const path of ['/privacy', '/terms', '/credits']) {
      await goto(path, { waitUntil: 'hydration' })

      const eclipseText = page.locator('nav').getByText('ECLIPSECHASE')
      await expect(eclipseText).toBeVisible()
    }
  })
})
