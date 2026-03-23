import { expect, test } from './fixtures'

test.describe('Guide page', () => {
  test('renders markdown content with article structure', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    // Guide content renders inside article
    const article = page.locator('article.guide-content')
    await expect(article).toBeVisible()

    // Should have at least one heading rendered from markdown
    const headings = article.locator('h1, h2')
    await expect(headings.first()).toBeVisible()
  })

  test('navigation has ECLIPSECHASE wordmark linking home', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    const logoLink = page.locator('nav a[href="/"]')
    await expect(logoLink).toBeVisible()
    await expect(logoLink.locator('text=ECLIPSECHASE')).toBeVisible()
  })

  test('footer has back-to-home link', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    const footer = page.locator('footer')
    const homeLink = footer.locator('a[href="/"]')
    await expect(homeLink).toBeVisible()
  })
})
