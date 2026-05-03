import { expect, test } from './fixtures'

test.describe('Navigation', () => {
  // BrandBar is rendered globally in app.vue and contains a single
  // <NuxtLink to="/"> with aria-label="EclipseChase — Home". That link
  // is the one cross-page nav affordance for free users — masthead +
  // BottomNav are Pro-gated and hidden on free routes / landing.

  test('BrandBar logo navigates home from /guide', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    const logoLink = page.locator('header.brand-bar a[href="/"]').first()
    await expect(logoLink).toBeVisible()

    await logoLink.click()
    await page.waitForURL('/', { timeout: 15000 })

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })

  test('BrandBar logo navigates home from /privacy', async ({ page, goto }) => {
    await goto('/privacy', { waitUntil: 'hydration' })

    const logoLink = page.locator('header.brand-bar a[href="/"]').first()
    await expect(logoLink).toBeVisible()

    await logoLink.click()
    await page.waitForURL('/', { timeout: 15000 })
  })

  test('Landing footer links to privacy and terms', async ({ page, goto }) => {
    // Landing is the only page with its own <footer>. Guide / privacy /
    // terms / credits / pro all rely on the BrandBar header for chrome
    // and don't render a page-level footer.
    await goto('/', { waitUntil: 'hydration' })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    await expect(footer.locator('a[href="/privacy"]')).toBeVisible()
    await expect(footer.locator('a[href="/terms"]')).toBeVisible()
  })
})
