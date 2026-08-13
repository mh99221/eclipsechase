import { expect, test } from './fixtures'

/**
 * RETIRED 2026-08-13. /map is gone; server/middleware/retired-routes.ts
 * answers it with a permanent 410. These tests lock in that contract so a
 * future change can't silently resurrect the live map surface.
 */
test.describe('Map page (retired)', () => {
  test('/map returns 410 Gone', async ({ page }) => {
    const response = await page.goto('/map')
    expect(response?.status()).toBe(410)
  })

  test('/dashboard returns 410 Gone', async ({ page }) => {
    const response = await page.goto('/dashboard')
    expect(response?.status()).toBe(410)
  })

  test('/pro redirects to the farewell page', async ({ page }) => {
    await page.goto('/pro')
    await expect(page).toHaveURL(/\/farewell/)
  })
})
