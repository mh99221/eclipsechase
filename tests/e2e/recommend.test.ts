import { expect, test } from './fixtures'

test.describe('Spots listing page', () => {
  test('spots page loads with grid of viewing spots', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toHaveText('Viewing Spots')
  })

  test('spots page shows spot cards with names', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    const firstCard = page.locator('a[href*="/spots/"]').first()
    await expect(firstCard).toBeVisible()
  })

  test('spot cards link to detail pages', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    const firstCard = page.locator('a[href*="/spots/"]').first()
    const href = await firstCard.getAttribute('href')
    expect(href).toMatch(/^\/spots\//)
  })
})
