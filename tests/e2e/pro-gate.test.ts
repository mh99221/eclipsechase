import { expect, test } from './fixtures'

test.describe('Pro gate middleware', () => {
  // In production builds, import.meta.dev is false, so the pro-gate middleware
  // IS active and redirects non-Pro users to /pro.

  test('/pro page is accessible and shows pricing', async ({ page, goto }) => {
    await goto('/pro', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Price should be visible
    const price = page.getByText('9.99')
    await expect(price.first()).toBeVisible()
  })

  test('free routes are always accessible — landing', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })

  test('free routes are always accessible — guide', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    const article = page.locator('article')
    await expect(article).toBeVisible()
  })

  test('/map redirects non-Pro user to /pro', async ({ page, goto }) => {
    await goto('/map', { waitUntil: 'hydration' })

    // Pro-gate redirects to /pro since user has no JWT
    await expect(page).toHaveURL(/\/pro/)
  })

  test('/recommend redirects non-Pro user to /pro', async ({ page, goto }) => {
    await goto('/recommend', { waitUntil: 'hydration' })

    await expect(page).toHaveURL(/\/pro/)
  })
})
