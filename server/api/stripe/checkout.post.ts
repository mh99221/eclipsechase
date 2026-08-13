/**
 * RETIRED 2026-08-13.
 *
 * The Aug 12 2026 eclipse has passed and Eclipse Pro is no longer sold.
 * This handler is kept (rather than deleted) so any stale client still
 * holding the old bundle gets an explicit, permanent 410 rather than a
 * confusing 404 from the router.
 *
 * The Stripe price must ALSO be archived in the Stripe dashboard — code
 * alone is not sufficient, because a Payment Link would bypass this
 * endpoint entirely. See docs/superpowers/plans/2026-08-13-eclipsechase-sunset.md
 * Task 1 Step 7.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Eclipse Pro is no longer for sale',
  })
})
