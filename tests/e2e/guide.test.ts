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

  test('BrandBar shows ECLIPSECHASE wordmark linking home', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    // Post-v0, the chrome wraps in <header class="brand-bar">, not <nav>.
    // BrandBar's internal <nav class="masthead"> is Pro-gated and not
    // rendered here; the only <nav> on /guide is the TOC inside the
    // article, which has no home link.
    const logoLink = page.locator('header.brand-bar a[href="/"]')
    await expect(logoLink).toBeVisible()
    await expect(logoLink.locator('text=ECLIPSECHASE')).toBeVisible()
  })
})
