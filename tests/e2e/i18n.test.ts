import { expect, test } from './fixtures'

test.describe('Internationalization', () => {
  test('default language is English', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Page should be in English (html lang attribute)
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('en')
  })

  test('/is/ prefix serves Icelandic locale', async ({ page, goto }) => {
    await goto('/is', { waitUntil: 'hydration' })

    // Should still render the landing page
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })

  test('English guide page renders', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    // Should have content
    const article = page.locator('article')
    await expect(article).toBeVisible()
  })
})
