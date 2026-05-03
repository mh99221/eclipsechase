import { expect, test } from './fixtures'

test.describe('Legal pages', () => {
  test('privacy page renders with heading', async ({ page, goto }) => {
    await goto('/privacy', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Privacy')
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

  test('all legal pages show the BrandBar wordmark', async ({ page, goto }) => {
    // Post-v0, ECLIPSECHASE lives in <header class="brand-bar">, not <nav>.
    for (const path of ['/privacy', '/terms', '/credits']) {
      await goto(path, { waitUntil: 'hydration' })

      const wordmark = page.locator('header.brand-bar').getByText('ECLIPSECHASE')
      await expect(wordmark).toBeVisible()
    }
  })
})
