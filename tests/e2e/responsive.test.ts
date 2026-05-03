import { expect, test } from './fixtures'

test.describe('Responsive layouts', () => {
  test('mobile viewport (375px) — landing page renders', async ({ page, goto }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await goto('/', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // BrandBar header is always present. The masthead <nav> and
    // BottomNav are both Pro-gated, so on a free landing page the
    // only chrome is the BrandBar header.
    const brandBar = page.locator('header.brand-bar')
    await expect(brandBar).toBeVisible()
  })

  test('tablet viewport (768px) — guide page renders', async ({ page, goto }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await goto('/guide', { waitUntil: 'hydration' })

    const article = page.locator('article')
    await expect(article).toBeVisible()
  })

  test('desktop viewport (1280px) — pro page renders', async ({ page, goto }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/pro', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Price should be visible
    const price = page.getByText('9.99')
    await expect(price.first()).toBeVisible()
  })

  test('mobile viewport — spot detail page renders without overflow', async ({ page, goto }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await goto('/spots/stykkisholmur-harbour', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)
  })
})
